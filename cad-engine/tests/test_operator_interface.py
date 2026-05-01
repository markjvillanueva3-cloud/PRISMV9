"""Tests for Operator Guidance Interface — CC-MS10.

Covers: NLQueryHandler, GuidanceGenerator, TeachMeMode.

Exit conditions:
  - Cross-domain NL queries route correctly (CAD/CAM/SHOP/troubleshoot)
  - Teach-me mode runs full pipeline end-to-end
  - All responses include validation status and provenance
  - Step-by-step guidance includes platform-specific menu paths
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.nl_query import (
    NLQueryHandler,
    QueryClassification,
    QueryDomain,
    QueryIntent,
    QueryResponse,
)
from src.guidance_gen import (
    GuidanceGenerator,
    GuidanceDocument,
    GuidanceStep,
    Platform,
)
from src.teach_me import (
    TeachMeMode,
    LearningReport,
    ExtractedKnowledge,
    ContentType,
    detect_content_type,
    classify_content_domain,
)


# ========================== NLQueryHandler ==========================


class TestQueryClassification:
    """Test NL query intent classification."""

    def test_cad_draw_request(self):
        handler = NLQueryHandler()
        c = handler.classify("Draw me a bearing block")
        assert c.domain == QueryDomain.CAD
        assert c.intent == QueryIntent.DRAW

    def test_cam_strategy_question(self):
        handler = NLQueryHandler()
        c = handler.classify("Best strategy for roughing 4140?")
        assert c.domain == QueryDomain.CAM
        assert c.intent == QueryIntent.RECOMMEND
        assert c.extracted_material == "4140"

    def test_shop_setup_question(self):
        handler = NLQueryHandler()
        c = handler.classify("How do I set up the vise for this part?")
        assert c.domain == QueryDomain.SHOP
        assert c.intent == QueryIntent.SETUP

    def test_troubleshoot_chatter(self):
        handler = NLQueryHandler()
        c = handler.classify("I'm getting chatter on my finishing pass")
        assert c.domain == QueryDomain.TROUBLESHOOT
        assert c.intent == QueryIntent.TROUBLESHOOT

    def test_teach_me_with_url(self):
        handler = NLQueryHandler()
        c = handler.classify("Teach me from this video: https://youtube.com/watch?v=abc123")
        assert c.intent == QueryIntent.TEACH
        assert "url" in c.extracted_parameters

    def test_material_extraction(self):
        handler = NLQueryHandler()
        c = handler.classify("What RPM for titanium with 10mm endmill?")
        assert c.extracted_material == "titanium"

    def test_operation_extraction(self):
        handler = NLQueryHandler()
        c = handler.classify("Best adaptive roughing strategy for aluminum?")
        assert c.extracted_operation in ("adaptive", "roughing")

    def test_rpm_parameter_extraction(self):
        handler = NLQueryHandler()
        c = handler.classify("Should I run at 5000 RPM for stainless?")
        assert c.extracted_parameters.get("rpm") == 5000

    def test_general_domain_fallback(self):
        handler = NLQueryHandler()
        c = handler.classify("Hello, what can you do?")
        assert c.domain == QueryDomain.GENERAL

    def test_confidence_positive(self):
        handler = NLQueryHandler()
        c = handler.classify("Draw me a bearing block with holes")
        assert c.confidence > 0.0

    def test_classification_to_dict(self):
        handler = NLQueryHandler()
        c = handler.classify("Draw me a bracket")
        d = c.to_dict()
        assert "domain" in d
        assert "intent" in d
        assert "confidence" in d

    def test_compare_intent(self):
        handler = NLQueryHandler()
        c = handler.classify("Climb vs conventional milling for aluminum?")
        assert c.intent == QueryIntent.COMPARE

    def test_calculate_intent(self):
        handler = NLQueryHandler()
        c = handler.classify("What RPM for 6061 with 10mm endmill?")
        assert c.intent == QueryIntent.CALCULATE

    def test_lookup_intent(self):
        handler = NLQueryHandler()
        c = handler.classify("Show me titanium properties")
        assert c.intent == QueryIntent.LOOKUP


class TestQueryRouting:
    """Test query routing and response generation."""

    def test_cad_route_has_steps(self):
        handler = NLQueryHandler()
        resp = handler.handle("Draw me a bearing block")
        assert resp.classification.domain == QueryDomain.CAD
        assert len(resp.steps) > 0
        assert len(resp.sources) > 0

    def test_cam_route_has_provenance(self):
        handler = NLQueryHandler()
        resp = handler.handle("Best strategy for roughing 4140?")
        assert resp.classification.domain == QueryDomain.CAM
        assert len(resp.sources) > 0
        assert resp.validation_status == "validated"

    def test_shop_route_validation(self):
        handler = NLQueryHandler()
        resp = handler.handle("How do I set up for milling in a vise?")
        assert resp.validation_status in ("validated", "unvalidated")
        assert isinstance(resp.safety_score, float)

    def test_troubleshoot_route_related(self):
        handler = NLQueryHandler()
        resp = handler.handle("I'm getting chatter during finishing")
        assert resp.classification.domain == QueryDomain.TROUBLESHOOT
        assert len(resp.related_queries) > 0

    def test_teach_route(self):
        handler = NLQueryHandler()
        resp = handler.handle("Teach me from this video: https://youtube.com/watch?v=abc")
        assert resp.classification.intent == QueryIntent.TEACH

    def test_general_fallback_response(self):
        handler = NLQueryHandler()
        resp = handler.handle("xyzzy gibberish")
        assert resp.answer
        assert isinstance(resp.classification, QueryClassification)

    def test_response_to_dict(self):
        handler = NLQueryHandler()
        resp = handler.handle("Draw me a bracket")
        d = resp.to_dict()
        assert "classification" in d
        assert "answer" in d
        assert "validation_status" in d
        assert "safety_score" in d
        assert "sources" in d


# ========================== GuidanceGenerator ==========================


class TestGuidanceGenerator:
    """Test step-by-step guidance generation."""

    def test_solidworks_extrude(self):
        gen = GuidanceGenerator()
        doc = gen.generate_cad_guidance(
            operation="extrude",
            parameters={"depth": 25.0},
            platform="solidworks",
        )
        assert doc.platform == "solidworks"
        assert doc.domain == "cad"
        assert doc.step_count > 0
        assert any("Insert" in s.menu_path for s in doc.steps if s.menu_path)

    def test_fusion360_hole(self):
        gen = GuidanceGenerator()
        doc = gen.generate_cad_guidance(
            operation="hole",
            parameters={"diameter": 10.0, "depth": 20.0},
            platform="fusion360",
        )
        assert doc.platform == "fusion360"
        assert any("Create" in s.menu_path for s in doc.steps if s.menu_path)

    def test_catia_fillet(self):
        gen = GuidanceGenerator()
        doc = gen.generate_cad_guidance(
            operation="fillet",
            parameters={"radius": 3.0},
            platform="catia",
        )
        fillet_steps = [s for s in doc.steps if s.menu_path and "Fillet" in s.menu_path]
        assert len(fillet_steps) > 0

    def test_generic_platform_fallback(self):
        gen = GuidanceGenerator(default_platform="generic")
        doc = gen.generate_cad_guidance(
            operation="extrude", parameters={"depth": 10.0},
        )
        assert doc.platform == "generic"
        assert doc.step_count > 0

    def test_cam_pocket_mastercam(self):
        gen = GuidanceGenerator()
        doc = gen.generate_cam_guidance(
            strategy_type="pocket_2d",
            parameters={"tool_diameter": 10.0, "cutting_speed": 200.0,
                        "feed_per_tooth": 0.1, "axial_depth": 3.0},
            platform="mastercam", material="steel",
        )
        assert doc.platform == "mastercam"
        assert doc.domain == "cam"
        assert any("Toolpaths" in s.menu_path for s in doc.steps if s.menu_path)

    def test_cam_adaptive_hypermill(self):
        gen = GuidanceGenerator()
        doc = gen.generate_cam_guidance(
            strategy_type="adaptive",
            parameters={"tool_diameter": 12.0},
            platform="hypermill",
        )
        assert any("Job List" in s.menu_path for s in doc.steps if s.menu_path)

    def test_cam_titanium_safety_warning(self):
        gen = GuidanceGenerator()
        doc = gen.generate_cam_guidance(
            strategy_type="pocket_2d",
            parameters={"tool_diameter": 10.0},
            platform="mastercam", material="titanium",
        )
        assert len(doc.safety_warnings) > 0
        assert "coolant" in doc.safety_warnings[0].lower()

    def test_cam_simulation_step(self):
        gen = GuidanceGenerator()
        doc = gen.generate_cam_guidance(
            strategy_type="contour",
            parameters={"tool_diameter": 8.0},
            platform="fusion_cam",
        )
        assert any("simulate" in s.action.lower() for s in doc.steps)

    def test_guidance_to_dict(self):
        gen = GuidanceGenerator()
        doc = gen.generate_cad_guidance(
            operation="extrude", parameters={"depth": 10.0}, platform="solidworks",
        )
        d = doc.to_dict()
        assert d["step_count"] == len(d["steps"])

    def test_prerequisites_present(self):
        gen = GuidanceGenerator()
        doc = gen.generate_cad_guidance(
            operation="hole", parameters={"diameter": 5.0}, platform="nx",
        )
        assert len(doc.prerequisites) > 0

    def test_cam_drilling_esprit(self):
        gen = GuidanceGenerator()
        doc = gen.generate_cam_guidance(
            strategy_type="drilling",
            parameters={"tool_diameter": 8.5},
            platform="esprit", material="steel",
        )
        assert any("Drill" in s.menu_path for s in doc.steps if s.menu_path)

    def test_tool_info_format(self):
        gen = GuidanceGenerator()
        doc = gen.generate_cam_guidance(
            strategy_type="pocket_2d",
            parameters={"tool_diameter": 10.0, "num_flutes": 4, "coating": "TiAlN"},
            platform="mastercam",
        )
        assert "D10" in doc.tool_info

    def test_step_to_dict(self):
        step = GuidanceStep(
            number=1, action="Select plane",
            menu_path="Insert > Sketch", parameters={"plane": "Top"},
        )
        d = step.to_dict()
        assert d["number"] == 1
        assert d["menu_path"] == "Insert > Sketch"


# ========================== TeachMeMode ==========================


class TestContentDetection:
    """Test URL content type detection."""

    def test_youtube_video(self):
        assert detect_content_type("https://youtube.com/watch?v=abc") == ContentType.VIDEO

    def test_youtu_be_short(self):
        assert detect_content_type("https://youtu.be/abc123") == ContentType.VIDEO

    def test_pdf_document(self):
        assert detect_content_type("https://example.com/manual.pdf") == ContentType.DOCUMENT

    def test_webpage(self):
        assert detect_content_type("https://example.com/article") == ContentType.WEBPAGE

    def test_unknown(self):
        assert detect_content_type("ftp://files/data.bin") == ContentType.UNKNOWN

    def test_vimeo_video(self):
        assert detect_content_type("https://vimeo.com/123456") == ContentType.VIDEO


class TestDomainClassification:
    """Test content domain classification."""

    def test_cam_content(self):
        domains = classify_content_domain("Set the feeds and speeds for roughing")
        assert "cam" in domains

    def test_shop_content(self):
        domains = classify_content_domain("Clamp the workpiece in the vise and probe")
        assert "shop" in domains

    def test_cad_content(self):
        domains = classify_content_domain("In SolidWorks, create a sketch and extrude")
        assert "cad" in domains

    def test_safety_content(self):
        domains = classify_content_domain("Always wear eye protection and emergency stop")
        assert "safety" in domains

    def test_general_fallback(self):
        domains = classify_content_domain("random words no context")
        assert "general" in domains


class TestTeachMeMode:
    """Test teach-me learning pipeline."""

    def test_start_pipeline(self):
        tm = TeachMeMode()
        report = tm.start_pipeline("https://youtube.com/watch?v=abc")
        assert report.pipeline_status == "pending"
        assert report.content_type == "video"

    def test_extract_parameters(self):
        tm = TeachMeMode()
        report = tm.start_pipeline("https://example.com/doc.pdf")
        report = tm.extract_knowledge(report, "Run at 300 m/min with 0.1 mm/tooth feed and 5000 RPM")
        assert report.extracted_count > 0
        assert report.pipeline_status == "extracting"

    def test_extract_practices(self):
        tm = TeachMeMode()
        report = tm.start_pipeline("https://example.com/guide")
        content = "Step 1: Clamp workpiece\nStep 2: Set offset\nTip: Check tool wear"
        report = tm.extract_knowledge(report, content)
        assert report.extracted_count > 0

    def test_extract_material_knowledge(self):
        tm = TeachMeMode()
        report = tm.start_pipeline("https://example.com/mat")
        report = tm.extract_knowledge(report, "Titanium is difficult to machine due to low thermal conductivity.")
        mat_items = [k for k in report.knowledge_items if k.domain == "material"]
        assert len(mat_items) > 0

    def test_validate_good_parameters(self):
        tm = TeachMeMode()
        report = tm.start_pipeline("https://example.com/speeds")
        report = tm.extract_knowledge(report, "For aluminum, run at 300 m/min with 0.1 mm/tooth feed")
        report = tm.validate_knowledge(report)
        assert report.validated_count > 0

    def test_validate_rejects_unsafe(self):
        tm = TeachMeMode()
        item = ExtractedKnowledge(
            domain="shop", category="practice",
            title="Bad", content="Remove guard for better visibility",
        )
        is_valid, notes = tm._validate_item(item)
        assert is_valid is False

    def test_validate_rejects_extreme_rpm(self):
        tm = TeachMeMode()
        item = ExtractedKnowledge(
            domain="cam", category="cutting_parameters",
            title="RPM", content="Fast", parameters={"rpm": 100000},
        )
        is_valid, _ = tm._validate_item(item)
        assert is_valid is False

    def test_full_pipeline(self):
        tm = TeachMeMode()
        content = """
        Step 1: Select a 3-flute carbide endmill
        Step 2: Set surface speed to 300 m/min
        Step 3: Use 0.1 mm/tooth feed per tooth
        Step 4: Set 5000 RPM spindle speed
        Tip: Use flood coolant
        """
        report = tm.run_full_pipeline(
            url="https://youtube.com/watch?v=machining101",
            content_text=content,
            title="Aluminum Machining Basics",
        )
        assert report.pipeline_status == "complete"
        assert report.title == "Aluminum Machining Basics"
        assert report.extracted_count > 0

    def test_report_to_dict(self):
        tm = TeachMeMode()
        report = tm.run_full_pipeline("https://example.com/test", "Aluminum machining at 300 m/min")
        d = report.to_dict()
        assert "pipeline_status" in d
        assert "key_takeaways" in d

    def test_empty_content(self):
        tm = TeachMeMode()
        report = tm.run_full_pipeline("https://example.com/empty", "")
        assert report.pipeline_status == "complete"
        assert report.extracted_count == 0

    def test_validate_passes_normal(self):
        tm = TeachMeMode()
        item = ExtractedKnowledge(
            domain="cam", category="cutting_parameters",
            title="Normal", content="Standard",
            parameters={"rpm": 5000, "cutting_speed": 200.0, "feed_per_tooth": 0.1},
        )
        is_valid, _ = tm._validate_item(item)
        assert is_valid is True

    def test_knowledge_to_dict(self):
        item = ExtractedKnowledge(
            domain="cam", category="tip", title="Test",
            content="Use coolant", confidence=0.8, validated=True,
        )
        d = item.to_dict()
        assert d["domain"] == "cam"
        assert d["validated"] is True


# ========================== Integration ==========================


class TestOperatorPipeline:
    """End-to-end pipeline tests."""

    def test_cad_query_to_guidance(self):
        handler = NLQueryHandler()
        resp = handler.handle("Draw me a bracket with holes")
        assert resp.classification.domain == QueryDomain.CAD
        gen = GuidanceGenerator()
        doc = gen.generate_cad_guidance("extrude", {"depth": 20.0}, "solidworks")
        assert doc.step_count > 0

    def test_cam_query_to_guidance(self):
        handler = NLQueryHandler()
        resp = handler.handle("Best roughing strategy for 4140 steel?")
        assert resp.classification.domain == QueryDomain.CAM
        gen = GuidanceGenerator()
        doc = gen.generate_cam_guidance("adaptive", {"tool_diameter": 12.0}, "mastercam", "steel")
        assert doc.step_count > 0

    def test_teach_me_full_flow(self):
        handler = NLQueryHandler()
        resp = handler.handle("Teach me from this video: https://youtube.com/watch?v=abc")
        assert resp.classification.intent == QueryIntent.TEACH
        tm = TeachMeMode()
        url = resp.classification.extracted_parameters.get("url", "https://example.com")
        report = tm.run_full_pipeline(url, "Roughing aluminum at 300 m/min with 0.1 mm/tooth feed")
        assert report.pipeline_status == "complete"

    def test_all_domains_route(self):
        handler = NLQueryHandler()
        cases = [
            ("Draw me a bearing block", QueryDomain.CAD),
            ("Best strategy for roughing 4140?", QueryDomain.CAM),
            ("How do I set up the vise?", QueryDomain.SHOP),
            ("I'm getting chatter", QueryDomain.TROUBLESHOOT),
        ]
        for query, expected in cases:
            resp = handler.handle(query)
            assert resp.classification.domain == expected, f"'{query}' -> {resp.classification.domain}"

    def test_all_responses_have_validation(self):
        handler = NLQueryHandler()
        for q in ["Draw me a bracket", "Best feed for steel?", "Chatter on finishing pass"]:
            resp = handler.handle(q)
            assert resp.validation_status in ("validated", "unvalidated", "warning", "blocked")
            assert isinstance(resp.safety_score, float)
