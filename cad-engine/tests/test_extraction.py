"""Tests for Knowledge Extraction Engine (CC-MS2).

Tests cover:
- Knowledge schema v2 validation
- CAD/CAM/SHOP prompt builders
- Domain-specific validators
- Cross-domain linking
- Extraction orchestrator (with mocked API)
- Shop context auto-detection
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

# ---------------------------------------------------------------------------
# Schema validation tests
# ---------------------------------------------------------------------------


class TestKnowledgeSchemaV2:
    """Verify schema file is valid JSON Schema and covers all 3 domains."""

    SCHEMA_PATH = Path(__file__).parent.parent / "schemas" / "knowledge_schema_v2.json"

    def test_schema_file_exists(self):
        assert self.SCHEMA_PATH.exists(), f"Schema not found at {self.SCHEMA_PATH}"

    def test_schema_is_valid_json(self):
        with open(self.SCHEMA_PATH) as f:
            schema = json.load(f)
        assert schema["version"] == "2.0.0"

    def test_schema_has_three_domains(self):
        with open(self.SCHEMA_PATH) as f:
            schema = json.load(f)
        domain_props = schema["properties"]["domains"]["properties"]
        assert "cad" in domain_props
        assert "cam" in domain_props
        assert "shop" in domain_props

    def test_schema_has_cross_links(self):
        with open(self.SCHEMA_PATH) as f:
            schema = json.load(f)
        assert "cross_domain_links" in schema["properties"]

    def test_schema_has_provenance_definition(self):
        with open(self.SCHEMA_PATH) as f:
            schema = json.load(f)
        assert "provenance" in schema["definitions"]
        prov = schema["definitions"]["provenance"]
        assert "confidence" in prov["properties"]
        assert "source_type" in prov["properties"]

    def test_schema_cad_feature_types(self):
        with open(self.SCHEMA_PATH) as f:
            schema = json.load(f)
        feature_types = schema["definitions"]["cad_feature"]["properties"]["feature_type"]["enum"]
        assert "extrude" in feature_types
        assert "fillet" in feature_types
        assert "revolve" in feature_types
        assert "hole" in feature_types
        assert len(feature_types) >= 15

    def test_schema_cam_operation_types(self):
        with open(self.SCHEMA_PATH) as f:
            schema = json.load(f)
        op_types = schema["definitions"]["cam_strategy"]["properties"]["operation_type"]["enum"]
        assert "adaptive" in op_types
        assert "drilling" in op_types
        assert "face_mill" in op_types
        assert len(op_types) >= 15

    def test_schema_shop_practice_types(self):
        with open(self.SCHEMA_PATH) as f:
            schema = json.load(f)
        practice_types = schema["definitions"]["shop_practice"]["properties"]["practice_type"]["enum"]
        assert "setup_procedure" in practice_types
        assert "troubleshooting" in practice_types
        assert "cutting_practice" in practice_types
        assert len(practice_types) >= 10


# ---------------------------------------------------------------------------
# Prompt builder tests
# ---------------------------------------------------------------------------


class TestCadPrompts:
    """Test CAD extraction prompt building."""

    def test_get_solidworks_prompt(self):
        from src.prompts.cad_prompts import get_cad_prompt
        prompt = get_cad_prompt("SolidWorks 2024")
        assert "Feature Manager" in prompt or "SolidWorks" in prompt

    def test_get_fusion360_prompt(self):
        from src.prompts.cad_prompts import get_cad_prompt
        prompt = get_cad_prompt("Fusion 360")
        assert "Timeline" in prompt or "Fusion" in prompt

    def test_get_autocad_prompt(self):
        from src.prompts.cad_prompts import get_cad_prompt
        prompt = get_cad_prompt("AutoCAD 2025")
        assert "AutoCAD" in prompt

    def test_get_generic_prompt(self):
        from src.prompts.cad_prompts import get_cad_prompt
        prompt = get_cad_prompt(None)
        assert "CAD tutorial" in prompt

    def test_get_unknown_falls_to_generic(self):
        from src.prompts.cad_prompts import get_cad_prompt
        prompt = get_cad_prompt("UnknownCAD v99")
        assert "CAD tutorial" in prompt

    def test_build_user_message_includes_transcript(self):
        from src.prompts.cad_prompts import build_cad_user_message
        msg = build_cad_user_message("This is a test transcript", platform="SolidWorks")
        assert "test transcript" in msg
        assert "TRANSCRIPT" in msg

    def test_build_user_message_includes_ocr(self):
        from src.prompts.cad_prompts import build_cad_user_message
        msg = build_cad_user_message("transcript", ocr_text="Extrude 25mm")
        assert "OCR TEXT" in msg
        assert "Extrude 25mm" in msg

    def test_build_user_message_includes_vision(self):
        from src.prompts.cad_prompts import build_cad_user_message
        msg = build_cad_user_message("transcript", vision_summary="Feature tree visible")
        assert "VISION ANALYSIS" in msg
        assert "Feature tree" in msg

    def test_build_user_message_truncates_long_transcript(self):
        from src.prompts.cad_prompts import build_cad_user_message
        long_text = "x" * 20000
        msg = build_cad_user_message(long_text)
        assert len(msg) < 20000


class TestCamPrompts:
    """Test CAM extraction prompt building."""

    def test_get_mastercam_prompt(self):
        from src.prompts.cam_prompts import get_cam_prompt
        prompt = get_cam_prompt("Mastercam 2025")
        assert "Mastercam" in prompt

    def test_get_fusion_cam_prompt(self):
        from src.prompts.cam_prompts import get_cam_prompt
        prompt = get_cam_prompt("Fusion 360")
        assert "Manufacturing workspace" in prompt or "Fusion" in prompt

    def test_get_generic_cam_prompt(self):
        from src.prompts.cam_prompts import get_cam_prompt
        prompt = get_cam_prompt(None)
        assert "CAM" in prompt

    def test_build_cam_user_message(self):
        from src.prompts.cam_prompts import build_cam_user_message
        msg = build_cam_user_message("roughing at 5000 RPM", platform="Mastercam")
        assert "roughing" in msg
        assert "TRANSCRIPT" in msg


class TestShopPrompts:
    """Test SHOP extraction prompt building."""

    def test_get_setup_prompt(self):
        from src.prompts.shop_prompts import get_shop_prompt
        prompt = get_shop_prompt("setup")
        assert "Work coordinate" in prompt or "work offset" in prompt.lower()

    def test_get_cutting_prompt(self):
        from src.prompts.shop_prompts import get_shop_prompt
        prompt = get_shop_prompt("cutting")
        assert "feeds and speeds" in prompt.lower() or "surface finish" in prompt.lower()

    def test_get_troubleshooting_prompt(self):
        from src.prompts.shop_prompts import get_shop_prompt
        prompt = get_shop_prompt("troubleshooting")
        assert "chatter" in prompt.lower() or "symptom" in prompt.lower()

    def test_detect_shop_context_setup(self):
        from src.prompts.shop_prompts import detect_shop_context
        result = detect_shop_context(
            "Today we're going to set up the work offset using G54 "
            "and touch off with an edge finder on the vise"
        )
        assert result == "setup"

    def test_detect_shop_context_cutting(self):
        from src.prompts.shop_prompts import detect_shop_context
        result = detect_shop_context(
            "Let's talk about feeds and speeds for this depth of cut "
            "and the surface finish we need with climb milling"
        )
        assert result == "cutting"

    def test_detect_shop_context_troubleshooting(self):
        from src.prompts.shop_prompts import detect_shop_context
        result = detect_shop_context(
            "We have a chatter problem and vibration issue, "
            "let me diagnose and troubleshoot this"
        )
        assert result == "troubleshooting"

    def test_detect_shop_context_unknown(self):
        from src.prompts.shop_prompts import detect_shop_context
        result = detect_shop_context("Hello world this is a general video")
        assert result is None


# ---------------------------------------------------------------------------
# Validator tests
# ---------------------------------------------------------------------------


class TestCadValidator:
    """Test CAD extraction validator."""

    def test_valid_extraction_passes(self):
        from src.validators.cad_validator import validate_cad_extraction
        data = {
            "features": [
                {
                    "id": "cad-001",
                    "name": "Base Extrude",
                    "feature_type": "extrude",
                    "parameters": [{"name": "height", "value": 25, "unit": "mm"}],
                    "parent_feature_id": None,
                    "design_intent": "Create base body",
                    "constraints": [],
                    "provenance": {"source_type": "transcript", "confidence": 0.9},
                    "cross_links": [],
                },
            ],
        }
        result = validate_cad_extraction(data)
        assert result["is_valid"] is True
        assert result["feature_count"] == 1

    def test_missing_id_fails(self):
        from src.validators.cad_validator import validate_cad_extraction
        data = {
            "features": [
                {"name": "test", "feature_type": "extrude"},
            ],
        }
        result = validate_cad_extraction(data)
        assert result["is_valid"] is False

    def test_unknown_feature_type_warns(self):
        from src.validators.cad_validator import validate_cad_extraction
        data = {
            "features": [
                {"id": "cad-001", "name": "test", "feature_type": "magic_operation"},
            ],
        }
        result = validate_cad_extraction(data)
        warnings = [f for f in result["findings"] if f["severity"] == "warning"]
        assert len(warnings) >= 1
        assert "magic_operation" in warnings[0]["message"]

    def test_dimension_out_of_range_warns(self):
        from src.validators.cad_validator import validate_cad_extraction
        data = {
            "features": [
                {
                    "id": "cad-001",
                    "name": "test",
                    "feature_type": "hole",
                    "parameters": [{"name": "hole_diameter", "value": -5, "unit": "mm"}],
                },
            ],
        }
        result = validate_cad_extraction(data)
        warnings = [f for f in result["findings"] if f["severity"] == "warning"]
        assert any("outside expected range" in w["message"] for w in warnings)

    def test_orphan_parent_ref_warns(self):
        from src.validators.cad_validator import validate_cad_extraction
        data = {
            "features": [
                {
                    "id": "cad-001",
                    "name": "test",
                    "feature_type": "fillet",
                    "parent_feature_id": "cad-999",
                },
            ],
        }
        result = validate_cad_extraction(data)
        assert result["orphan_count"] == 1

    def test_duplicate_id_fails(self):
        from src.validators.cad_validator import validate_cad_extraction
        data = {
            "features": [
                {"id": "cad-001", "name": "a", "feature_type": "extrude"},
                {"id": "cad-001", "name": "b", "feature_type": "fillet"},
            ],
        }
        result = validate_cad_extraction(data)
        errors = [f for f in result["findings"] if f["severity"] == "error"]
        assert any("Duplicate" in e["message"] for e in errors)

    def test_empty_features_is_valid(self):
        from src.validators.cad_validator import validate_cad_extraction
        result = validate_cad_extraction({"features": []})
        assert result["is_valid"] is True
        assert result["feature_count"] == 0


class TestCamValidator:
    """Test CAM extraction validator."""

    def test_valid_strategy_passes(self):
        from src.validators.cam_validator import validate_cam_extraction
        data = {
            "strategies": [
                {
                    "id": "cam-001",
                    "name": "Rough Pocket",
                    "operation_type": "adaptive",
                    "sequence_order": 1,
                    "tool": {"type": "end_mill", "diameter_mm": 12, "flutes": 3},
                    "cutting_parameters": [
                        {"name": "spindle_rpm", "value": 5000, "unit": "rpm"},
                        {"name": "feed_rate", "value": 2000, "unit": "mm/min"},
                    ],
                    "provenance": {"source_type": "transcript", "confidence": 0.85},
                    "cross_links": [],
                },
            ],
        }
        result = validate_cam_extraction(data)
        assert result["is_valid"] is True
        assert result["strategy_count"] == 1
        assert result["tools_found"] == 1

    def test_rpm_out_of_range_warns(self):
        from src.validators.cam_validator import validate_cam_extraction
        data = {
            "strategies": [
                {
                    "id": "cam-001",
                    "name": "test",
                    "operation_type": "drilling",
                    "cutting_parameters": [
                        {"name": "spindle_rpm", "value": 999999, "unit": "rpm"},
                    ],
                },
            ],
        }
        result = validate_cam_extraction(data)
        warnings = [f for f in result["findings"] if f["severity"] == "warning"]
        assert any("outside expected range" in w["message"] for w in warnings)

    def test_tool_diameter_out_of_range_warns(self):
        from src.validators.cam_validator import validate_cam_extraction
        data = {
            "strategies": [
                {
                    "id": "cam-001",
                    "name": "test",
                    "operation_type": "face_mill",
                    "tool": {"type": "face_mill", "diameter_mm": 500},
                },
            ],
        }
        result = validate_cam_extraction(data)
        warnings = [f for f in result["findings"] if f["severity"] == "warning"]
        assert any("diameter" in w["message"].lower() for w in warnings)

    def test_duplicate_sequence_warns(self):
        from src.validators.cam_validator import validate_cam_extraction
        data = {
            "strategies": [
                {"id": "cam-001", "name": "a", "operation_type": "drilling", "sequence_order": 1},
                {"id": "cam-002", "name": "b", "operation_type": "tapping", "sequence_order": 1},
            ],
        }
        result = validate_cam_extraction(data)
        warnings = [f for f in result["findings"] if f["severity"] == "warning"]
        assert any("sequence_order" in w["message"] for w in warnings)


class TestShopValidator:
    """Test SHOP extraction validator."""

    def test_valid_practice_passes(self):
        from src.validators.shop_validator import validate_shop_extraction
        data = {
            "practices": [
                {
                    "id": "shop-001",
                    "title": "Work Offset Setup with Edge Finder",
                    "practice_type": "setup_procedure",
                    "description": "How to set G54 using an edge finder.",
                    "steps": ["Mount edge finder in spindle", "Jog to X face", "Touch off"],
                    "applicable_materials": [],
                    "applicable_machines": ["VMC"],
                    "applicable_controllers": ["Haas"],
                    "warnings": ["Ensure spindle is running at correct RPM for edge finder"],
                    "provenance": {"source_type": "transcript", "confidence": 0.9},
                    "cross_links": [],
                },
            ],
        }
        result = validate_shop_extraction(data)
        assert result["is_valid"] is True
        assert result["practice_count"] == 1
        assert result["safety_warnings_count"] == 1

    def test_missing_description_fails(self):
        from src.validators.shop_validator import validate_shop_extraction
        data = {
            "practices": [
                {"id": "shop-001", "title": "test", "practice_type": "other"},
            ],
        }
        result = validate_shop_extraction(data)
        assert result["is_valid"] is False

    def test_safety_relevant_without_warnings_flagged(self):
        from src.validators.shop_validator import validate_shop_extraction
        data = {
            "practices": [
                {
                    "id": "shop-001",
                    "title": "Setup",
                    "practice_type": "setup_procedure",
                    "description": "Some setup procedure",
                    "warnings": [],
                },
            ],
        }
        result = validate_shop_extraction(data)
        info = [f for f in result["findings"] if f["severity"] == "info"]
        assert any("no warnings" in i["message"].lower() for i in info)


# ---------------------------------------------------------------------------
# Cross-domain linking tests
# ---------------------------------------------------------------------------


class TestCrossDomainLinking:
    """Test cross-domain link discovery."""

    def test_cam_to_cad_link(self):
        from src.knowledge_extract import _build_cross_links
        domains = {
            "cad": {
                "features": [
                    {"id": "cad-001", "name": "Pocket", "feature_type": "extrude"},
                ],
            },
            "cam": {
                "strategies": [
                    {
                        "id": "cam-001",
                        "name": "Pocket Roughing",
                        "target_features": ["cad-001"],
                    },
                ],
            },
        }
        links = _build_cross_links(domains)
        assert len(links) >= 1
        assert links[0]["from_domain"] == "cam"
        assert links[0]["to_domain"] == "cad"
        assert links[0]["relationship"] == "implements"

    def test_no_links_for_empty_domains(self):
        from src.knowledge_extract import _build_cross_links
        links = _build_cross_links({})
        assert links == []

    def test_shop_to_cam_tool_link(self):
        from src.knowledge_extract import _build_cross_links
        domains = {
            "cam": {
                "strategies": [
                    {
                        "id": "cam-001",
                        "name": "Pocket",
                        "tool": {"type": "end_mill"},
                        "target_features": [],
                    },
                ],
            },
            "shop": {
                "practices": [
                    {
                        "id": "shop-001",
                        "title": "End Mill Selection",
                        "description": "How to select the right end_mill for aluminum",
                    },
                ],
            },
        }
        links = _build_cross_links(domains)
        assert any(l["from_domain"] == "shop" and l["to_domain"] == "cam" for l in links)


# ---------------------------------------------------------------------------
# Statistics tests
# ---------------------------------------------------------------------------


class TestExtractionStats:
    """Test extraction statistics computation."""

    def test_compute_stats(self):
        from src.knowledge_extract import _compute_stats
        domains = {
            "cad": {
                "features": [
                    {"id": "cad-001", "provenance": {"source_type": "transcript", "confidence": 0.9}},
                    {"id": "cad-002", "provenance": {"source_type": "vision", "confidence": 0.7}},
                ],
            },
            "cam": {
                "strategies": [
                    {"id": "cam-001", "provenance": {"source_type": "transcript", "confidence": 0.8}},
                ],
            },
            "shop": {
                "practices": [
                    {"id": "shop-001", "provenance": {"source_type": "ocr", "confidence": 0.6}},
                ],
            },
        }
        stats = _compute_stats(domains, [{"dummy": True}])
        assert stats["total_items"] == 4
        assert stats["cad_features"] == 2
        assert stats["cam_strategies"] == 1
        assert stats["shop_practices"] == 1
        assert stats["cross_links"] == 1
        assert 0.7 <= stats["avg_confidence"] <= 0.8
        assert "transcript" in stats["sources_used"]
        assert "vision" in stats["sources_used"]
        assert "ocr" in stats["sources_used"]


# ---------------------------------------------------------------------------
# Orchestrator integration tests (mocked API)
# ---------------------------------------------------------------------------


# Sample API responses simulating what Claude would return
_MOCK_CAD_RESPONSE = json.dumps({
    "features": [
        {
            "id": "cad-001",
            "name": "Base Sketch",
            "feature_type": "sketch",
            "parameters": [{"name": "width", "value": 100, "unit": "mm"}],
            "parent_feature_id": None,
            "design_intent": "Foundation for the bracket",
            "constraints": ["fully_defined"],
            "provenance": {"source_type": "transcript", "confidence": 0.9, "timestamp_seconds": 45.0, "transcript_span": "sketch a 100mm rectangle"},
            "cross_links": [],
        },
        {
            "id": "cad-002",
            "name": "Base Extrude",
            "feature_type": "extrude",
            "parameters": [{"name": "height", "value": 25, "unit": "mm"}],
            "parent_feature_id": "cad-001",
            "design_intent": "Create solid body from sketch",
            "constraints": [],
            "provenance": {"source_type": "transcript", "confidence": 0.85, "timestamp_seconds": 60.0, "transcript_span": "extrude 25mm"},
            "cross_links": [],
        },
    ],
    "design_intent_summary": "L-bracket for mounting applications",
    "modeling_approach": "Bottom-up solid modeling with parametric features",
})

_MOCK_CAM_RESPONSE = json.dumps({
    "strategies": [
        {
            "id": "cam-001",
            "name": "Face Mill Top",
            "operation_type": "face_mill",
            "sequence_order": 1,
            "tool": {"type": "face_mill", "diameter_mm": 50, "flutes": 5, "material": "carbide", "coating": "TiAlN", "description": "50mm face mill"},
            "cutting_parameters": [
                {"name": "spindle_rpm", "value": 3000, "unit": "rpm"},
                {"name": "feed_rate", "value": 1500, "unit": "mm/min"},
                {"name": "depth_of_cut", "value": 1.0, "unit": "mm"},
            ],
            "strategy_rationale": "Face the top to ensure flat reference surface",
            "target_features": ["cad-002"],
            "workholding": "vise",
            "coolant": "flood",
            "provenance": {"source_type": "transcript", "confidence": 0.8, "timestamp_seconds": 120.0, "transcript_span": "face mill at 3000 RPM"},
            "cross_links": [],
        },
    ],
    "machining_summary": "Single setup facing operation on aluminum bracket",
    "tool_list": [{"number": 1, "type": "face_mill", "diameter_mm": 50, "description": "50mm face mill"}],
})

_MOCK_SHOP_RESPONSE = json.dumps({
    "practices": [
        {
            "id": "shop-001",
            "title": "Vise Alignment with Dial Indicator",
            "practice_type": "setup_procedure",
            "description": "Align the vise jaw parallel to X axis using a dial indicator.",
            "steps": [
                "Mount dial indicator in spindle",
                "Touch indicator to fixed jaw",
                "Jog X axis along jaw face",
                "Adjust vise until indicator reads within 0.001 inch",
                "Tighten vise bolts",
            ],
            "applicable_materials": [],
            "applicable_machines": ["VMC"],
            "applicable_controllers": ["Haas", "Fanuc"],
            "warnings": ["Do not over-tighten vise bolts — can warp jaw"],
            "provenance": {"source_type": "transcript", "confidence": 0.95, "timestamp_seconds": 30.0, "transcript_span": "indicate your vise"},
            "cross_links": [],
        },
    ],
    "setup_summary": "Vise setup and alignment for precision milling",
    "key_takeaways": ["Always indicate vise before precision work"],
})


class TestExtractionOrchestrator:
    """Test the full extraction pipeline with mocked Claude API."""

    @patch("src.knowledge_extract._call_extraction")
    def test_full_extraction_multi_domain(self, mock_call):
        """Test multi-domain extraction with all 3 domains."""
        mock_call.side_effect = [
            json.loads(_MOCK_CAD_RESPONSE),
            json.loads(_MOCK_CAM_RESPONSE),
            json.loads(_MOCK_SHOP_RESPONSE),
        ]

        from src.knowledge_extract import extract_knowledge

        result = extract_knowledge(
            video_id="test-001",
            title="SolidWorks Bracket Design and CNC Machining",
            transcript=(
                "Today we'll design a bracket in SolidWorks. "
                "First sketch a 100mm rectangle, then extrude 25mm. "
                "In Mastercam, we'll face mill at 3000 RPM. "
                "On the Haas, indicate your vise first."
            ),
            force_domain="multi",
        )

        assert result.video_id == "test-001"
        assert result.knowledge["schema_version"] == "2.0.0"
        assert result.knowledge["metadata"]["primary_domain"] == "multi"

        # All 3 domains extracted
        domains = result.knowledge["domains"]
        assert "cad" in domains
        assert "cam" in domains
        assert "shop" in domains

        # CAD features
        assert len(domains["cad"]["features"]) == 2
        assert domains["cad"]["features"][0]["name"] == "Base Sketch"

        # CAM strategies
        assert len(domains["cam"]["strategies"]) == 1
        assert domains["cam"]["strategies"][0]["operation_type"] == "face_mill"

        # SHOP practices
        assert len(domains["shop"]["practices"]) == 1
        assert domains["shop"]["practices"][0]["practice_type"] == "setup_procedure"

        # Cross-domain links (CAM -> CAD via target_features)
        links = result.knowledge["cross_domain_links"]
        assert len(links) >= 1

        # Stats
        stats = result.knowledge["extraction_stats"]
        assert stats["total_items"] == 4
        assert stats["cad_features"] == 2
        assert stats["cam_strategies"] == 1
        assert stats["shop_practices"] == 1

    @patch("src.knowledge_extract._call_extraction")
    def test_single_domain_cad(self, mock_call):
        """Test CAD-only extraction."""
        mock_call.return_value = json.loads(_MOCK_CAD_RESPONSE)

        from src.knowledge_extract import extract_knowledge

        result = extract_knowledge(
            video_id="test-002",
            title="SolidWorks Tutorial: Design a Bracket",
            transcript="Let's design a bracket in SolidWorks...",
            force_domain="cad",
        )

        assert "cad" in result.knowledge["domains"]
        assert "cam" not in result.knowledge["domains"]
        assert "shop" not in result.knowledge["domains"]
        assert result.knowledge["extraction_stats"]["cad_features"] == 2

    @patch("src.knowledge_extract._call_extraction")
    def test_validation_results_included(self, mock_call):
        """Test that validation results are included."""
        mock_call.return_value = json.loads(_MOCK_CAD_RESPONSE)

        from src.knowledge_extract import extract_knowledge

        result = extract_knowledge(
            video_id="test-003",
            title="CAD Tutorial",
            transcript="extrude and fillet",
            force_domain="cad",
        )

        assert "cad" in result.validation_results
        assert result.validation_results["cad"]["is_valid"] is True

    @patch("src.knowledge_extract._call_extraction")
    def test_api_error_recorded(self, mock_call):
        """Test that API failures are recorded as errors."""
        from src.knowledge_extract import extract_knowledge, ExtractionError
        mock_call.side_effect = ExtractionError("API rate limit exceeded")

        result = extract_knowledge(
            video_id="test-004",
            title="CAD Tutorial",
            transcript="test",
            force_domain="cad",
        )

        assert not result.is_valid
        assert len(result.errors) >= 1
        assert "rate limit" in result.errors[0].lower()

    @patch("src.knowledge_extract._call_extraction")
    def test_save_knowledge(self, mock_call, tmp_path):
        """Test saving knowledge to file."""
        mock_call.return_value = json.loads(_MOCK_CAD_RESPONSE)

        from src.knowledge_extract import extract_knowledge, save_knowledge

        result = extract_knowledge(
            video_id="test-005",
            title="Test",
            transcript="test",
            force_domain="cad",
        )

        output_path = save_knowledge(result, tmp_path)
        assert output_path.exists()
        assert output_path.name == "knowledge_test-005.json"

        with open(output_path) as f:
            saved = json.load(f)
        assert saved["schema_version"] == "2.0.0"
        assert saved["video_id"] == "test-005"

    @patch("src.knowledge_extract._call_extraction")
    def test_extraction_result_to_dict(self, mock_call):
        """Test ExtractionResult serialization."""
        mock_call.return_value = json.loads(_MOCK_CAD_RESPONSE)

        from src.knowledge_extract import extract_knowledge

        result = extract_knowledge(
            video_id="test-006",
            title="Test",
            transcript="test",
            force_domain="cad",
        )

        d = result.to_dict()
        assert d["video_id"] == "test-006"
        assert d["is_valid"] is True
        assert "knowledge" in d

    @patch("src.knowledge_extract._call_extraction")
    def test_provenance_tracking(self, mock_call):
        """Test that provenance data flows through correctly."""
        mock_call.return_value = json.loads(_MOCK_CAD_RESPONSE)

        from src.knowledge_extract import extract_knowledge

        result = extract_knowledge(
            video_id="test-007",
            title="Test",
            transcript="test",
            force_domain="cad",
        )

        feat = result.knowledge["domains"]["cad"]["features"][0]
        prov = feat["provenance"]
        assert prov["source_type"] == "transcript"
        assert prov["confidence"] == 0.9
        assert prov["timestamp_seconds"] == 45.0

    @patch("src.knowledge_extract._call_extraction")
    def test_metadata_populated(self, mock_call):
        """Test that metadata is fully populated."""
        mock_call.return_value = json.loads(_MOCK_CAD_RESPONSE)

        from src.knowledge_extract import extract_knowledge

        result = extract_knowledge(
            video_id="test-008",
            title="SolidWorks Bracket",
            transcript="solidworks bracket tutorial",
            duration_seconds=600,
            uploader="CNCTech",
            tags=["solidworks", "bracket"],
            force_domain="cad",
        )

        meta = result.knowledge["metadata"]
        assert meta["title"] == "SolidWorks Bracket"
        assert meta["duration_seconds"] == 600
        assert meta["uploader"] == "CNCTech"
        assert "solidworks" in meta["tags"]


# ---------------------------------------------------------------------------
# Scrutiny fix tests (Phase 7)
# ---------------------------------------------------------------------------


class TestSecurityFixes:
    """Tests for security fixes found during scrutiny."""

    @patch("src.knowledge_extract._call_extraction")
    def test_save_knowledge_sanitizes_video_id(self, mock_call, tmp_path):
        """Path traversal characters in video_id are sanitized."""
        mock_call.return_value = json.loads(_MOCK_CAD_RESPONSE)

        from src.knowledge_extract import extract_knowledge, save_knowledge

        result = extract_knowledge(
            video_id="../../../etc/passwd",
            title="Test",
            transcript="test",
            force_domain="cad",
        )

        output_path = save_knowledge(result, tmp_path)
        # Should NOT escape the output directory
        assert str(output_path.resolve()).startswith(str(tmp_path.resolve()))
        # Should not contain path separators
        assert "/" not in output_path.name.replace("knowledge_", "").replace(".json", "").strip("_.")
        assert "\\" not in output_path.name

    @patch("src.knowledge_extract._call_extraction")
    def test_save_knowledge_sanitizes_slashes(self, mock_call, tmp_path):
        """Slashes in video_id are replaced with underscores."""
        mock_call.return_value = json.loads(_MOCK_CAD_RESPONSE)

        from src.knowledge_extract import extract_knowledge, save_knowledge

        result = extract_knowledge(
            video_id="video/with\\slashes",
            title="Test",
            transcript="test",
            force_domain="cad",
        )

        output_path = save_knowledge(result, tmp_path)
        assert output_path.exists()
        assert "knowledge_video_with_slashes.json" == output_path.name

    def test_invalid_force_domain_raises(self):
        """Invalid force_domain value raises ExtractionError."""
        from src.knowledge_extract import extract_knowledge, ExtractionError

        with pytest.raises(ExtractionError, match="Invalid force_domain"):
            extract_knowledge(
                video_id="test",
                title="Test",
                transcript="test",
                force_domain="invalid_domain",
            )


class TestRobustnessFixes:
    """Tests for robustness fixes found during scrutiny."""

    def test_empty_response_content_raises(self):
        """Empty API response raises ExtractionError."""
        from src.knowledge_extract import _call_extraction, ExtractionError

        mock_response = MagicMock()
        mock_response.content = []

        with patch("src.knowledge_extract._get_client") as mock_client:
            mock_client.return_value.messages.create.return_value = mock_response

            with pytest.raises(ExtractionError, match="Empty response"):
                _call_extraction("system", "user")

    def test_fence_stripping_json(self):
        """Markdown ```json fences are stripped correctly."""
        from src.knowledge_extract import _call_extraction

        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='```json\n{"features": []}\n```')]

        with patch("src.knowledge_extract._get_client") as mock_client:
            mock_client.return_value.messages.create.return_value = mock_response
            result = _call_extraction("system", "user")
            assert result == {"features": []}

    def test_fence_stripping_bare(self):
        """Markdown ``` fences without language tag are stripped."""
        from src.knowledge_extract import _call_extraction

        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='```\n{"strategies": [1]}\n```')]

        with patch("src.knowledge_extract._get_client") as mock_client:
            mock_client.return_value.messages.create.return_value = mock_response
            result = _call_extraction("system", "user")
            assert result == {"strategies": [1]}

    def test_fence_stripping_no_closing(self):
        """Opening fence without closing fence still parses."""
        from src.knowledge_extract import _call_extraction

        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='```json\n{"ok": true}')]

        with patch("src.knowledge_extract._get_client") as mock_client:
            mock_client.return_value.messages.create.return_value = mock_response
            result = _call_extraction("system", "user")
            assert result == {"ok": True}

    def test_cross_link_tracks_tool_owner(self):
        """SHOP->CAM link uses the correct strategy that owns the tool, not always the first."""
        from src.knowledge_extract import _build_cross_links

        domains = {
            "cam": {
                "strategies": [
                    {"id": "cam-001", "name": "Facing", "tool": {"type": "face_mill"}, "target_features": []},
                    {"id": "cam-002", "name": "Drilling", "tool": {"type": "drill"}, "target_features": []},
                ],
            },
            "shop": {
                "practices": [
                    {"id": "shop-001", "title": "Drill Setup", "description": "Setting up the drill for holes"},
                ],
            },
        }

        links = _build_cross_links(domains)
        shop_links = [l for l in links if l["from_domain"] == "shop"]
        assert len(shop_links) == 1
        # Should link to cam-002 (drill owner), not cam-001 (first strategy)
        assert shop_links[0]["to_id"] == "cam-002"


class TestValidationFindingShared:
    """Test that ValidationFinding is shared across all validators."""

    def test_common_validation_finding_imported(self):
        from src.validators.common import ValidationFinding
        from src.validators.cad_validator import validate_cad_extraction
        from src.validators.cam_validator import validate_cam_extraction
        from src.validators.shop_validator import validate_shop_extraction

        # All validators should work with the shared ValidationFinding
        cad_result = validate_cad_extraction({"features": []})
        cam_result = validate_cam_extraction({"strategies": []})
        shop_result = validate_shop_extraction({"practices": []})

        assert cad_result["is_valid"] is True
        assert cam_result["is_valid"] is True
        assert shop_result["is_valid"] is True


class TestReScrutinyFixes:
    """Tests for re-scrutiny round 2 fixes."""

    def test_cross_link_skips_missing_strategy_id(self):
        """Strategies without 'id' field don't cause KeyError in cross-links."""
        from src.knowledge_extract import _build_cross_links

        domains = {
            "cad": {
                "features": [{"id": "cad-001", "name": "Pocket", "feature_type": "extrude"}],
            },
            "cam": {
                "strategies": [
                    {"name": "No ID Strategy", "target_features": ["cad-001"]},
                    {"id": "cam-002", "name": "With ID", "target_features": ["cad-001"]},
                ],
            },
        }
        # Should not raise KeyError
        links = _build_cross_links(domains)
        # Only the strategy with an ID should produce a link
        assert all(l["from_id"] == "cam-002" for l in links if l["from_domain"] == "cam")

    def test_cross_link_skips_missing_practice_id(self):
        """Practices without 'id' field don't cause KeyError in cross-links."""
        from src.knowledge_extract import _build_cross_links

        domains = {
            "cam": {
                "strategies": [
                    {"id": "cam-001", "name": "Mill", "tool": {"type": "end_mill"}, "target_features": []},
                ],
            },
            "shop": {
                "practices": [
                    {"title": "No ID Practice", "description": "end_mill tips"},
                    {"id": "shop-002", "title": "End Mill Care", "description": "end_mill maintenance"},
                ],
            },
        }
        links = _build_cross_links(domains)
        shop_links = [l for l in links if l["from_domain"] == "shop"]
        # Only shop-002 (has ID) should link
        assert all(l["from_id"] == "shop-002" for l in shop_links)

    def test_cross_link_skips_missing_feature_id(self):
        """Features without 'id' are excluded from cross-link lookup."""
        from src.knowledge_extract import _build_cross_links

        domains = {
            "cad": {
                "features": [
                    {"name": "No ID Feature", "feature_type": "extrude"},
                    {"id": "cad-002", "name": "Valid", "feature_type": "hole"},
                ],
            },
            "cam": {
                "strategies": [
                    {"id": "cam-001", "name": "Op", "target_features": ["cad-002"]},
                ],
            },
        }
        links = _build_cross_links(domains)
        assert len(links) == 1
        assert links[0]["to_id"] == "cad-002"

    @patch("src.knowledge_extract._call_extraction")
    def test_is_valid_checks_validation_results(self, mock_call):
        """ExtractionResult.is_valid returns False when validators report errors."""
        # Return data with missing required fields so validator flags errors
        mock_call.return_value = {
            "features": [
                {"name": "no id or type"},  # missing id and feature_type
            ],
        }

        from src.knowledge_extract import extract_knowledge

        result = extract_knowledge(
            video_id="test-valid",
            title="Test",
            transcript="test",
            force_domain="cad",
        )

        # Validator should have flagged errors
        assert result.validation_results["cad"]["is_valid"] is False
        # ExtractionResult.is_valid should now also be False
        assert result.is_valid is False
