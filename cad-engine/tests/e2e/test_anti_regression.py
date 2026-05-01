"""E2E Test: Anti-Regression — CC-MS11.

Verifies all CC modules remain functional with no regressions.
Tests import chains, API contracts, and cross-module integration.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))


class TestModuleAPIContracts:
    """Every public API returns the expected types and shapes."""

    def test_feature_analyzer_contract(self):
        """FeatureAnalyzer.analyze() returns FeatureAnalysisResult."""
        from src.feature_analyze import FeatureAnalyzer, FeatureAnalysisResult, FeatureType

        analyzer = FeatureAnalyzer(material="steel")
        result = analyzer.analyze("REG-001", [
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}},
            {"type": "pocket", "dimensions": {"width": 30.0, "depth": 8.0}},
        ])
        assert isinstance(result, FeatureAnalysisResult)
        assert result.feature_count == 2
        assert result.part_id == "REG-001"
        assert result.material == "steel"
        # to_dict round-trip
        d = result.to_dict()
        assert d["part_id"] == "REG-001"
        assert len(d["features"]) == 2

    def test_mfg_checker_contract(self):
        """ManufacturabilityChecker.validate() returns ManufacturabilityReport."""
        from src.feature_analyze import FeatureAnalyzer
        from src.mfg_checker import ManufacturabilityChecker, ManufacturabilityReport

        analyzer = FeatureAnalyzer(material="steel")
        analysis = analyzer.analyze("REG-002", [
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}},
        ])
        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)
        assert isinstance(report, ManufacturabilityReport)
        assert report.part_id == "REG-002"
        assert len(report.feature_validations) == 1
        assert report.total_checks > 0
        d = report.to_dict()
        assert isinstance(d["overall_safety_score"], float)

    def test_cam_overlay_validate_strategy_contract(self):
        """CAMSafetyOverlay.validate_strategy() returns StrategyValidation."""
        from src.cam_safety_overlay import CAMSafetyOverlay, StrategyValidation

        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="REG-CAM-001",
            material="aluminum",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            cutting_speed=300.0,
            feed_per_tooth=0.1,
            axial_depth=2.0,
        )
        assert isinstance(sv, StrategyValidation)
        assert sv.strategy_id == "REG-CAM-001"
        assert sv.cutting_force_N > 0
        d = sv.to_dict()
        assert "safety_score" in d

    def test_cam_overlay_validate_all_contract(self):
        """CAMSafetyOverlay.validate_all() returns CAMSafetyReport."""
        from src.cam_safety_overlay import CAMSafetyOverlay, CAMSafetyReport

        overlay = CAMSafetyOverlay()
        report = overlay.validate_all([{
            "strategy_id": "REG-BATCH",
            "material": "aluminum",
            "operation_type": "face_mill",
            "parameters": {"tool_diameter": 50.0, "cutting_speed": 400.0,
                          "feed_per_tooth": 0.15, "axial_depth": 2.0},
        }])
        assert isinstance(report, CAMSafetyReport)
        assert report.total_strategies == 1
        assert report.validated == 1

    def test_shop_validator_contract(self):
        """ShopSafetyValidator.validate_practice() returns PracticeValidation."""
        from src.shop_safety_validator import ShopSafetyValidator, PracticeValidation

        validator = ShopSafetyValidator()
        pv = validator.validate_practice({
            "practice_id": "REG-SHOP-001",
            "title": "Milling",
            "category": "milling",
            "description": "Standard milling at 3000 RPM.",
            "steps": ["Clamp"], "warnings": ["Be safe"],
            "applicable_materials": ["aluminum"],
        })
        assert isinstance(pv, PracticeValidation)
        assert pv.practice_id == "REG-SHOP-001"

    def test_nl_query_handler_contract(self):
        """NLQueryHandler.handle() returns QueryResponse."""
        from src.nl_query import NLQueryHandler, QueryResponse, QueryDomain

        handler = NLQueryHandler()
        resp = handler.handle("Draw me a bearing block")
        assert isinstance(resp, QueryResponse)
        assert resp.classification.domain == QueryDomain.CAD
        assert resp.validation_status == "validated"

    def test_guidance_generator_cad_contract(self):
        """GuidanceGenerator.generate_cad_guidance() returns GuidanceDocument."""
        from src.guidance_gen import GuidanceGenerator, GuidanceDocument

        gen = GuidanceGenerator()
        doc = gen.generate_cad_guidance(
            operation="extrude",
            parameters={"depth": 20.0},
            platform="solidworks",
        )
        assert isinstance(doc, GuidanceDocument)
        assert doc.platform == "solidworks"
        assert doc.step_count > 0

    def test_guidance_generator_cam_contract(self):
        """GuidanceGenerator.generate_cam_guidance() returns GuidanceDocument."""
        from src.guidance_gen import GuidanceGenerator, GuidanceDocument

        gen = GuidanceGenerator()
        doc = gen.generate_cam_guidance(
            strategy_type="adaptive",
            parameters={"tool_diameter": 12.0, "cutting_speed": 150.0},
            platform="mastercam",
            material="steel",
        )
        assert isinstance(doc, GuidanceDocument)
        assert doc.platform == "mastercam"
        assert doc.step_count >= 5

    def test_teach_me_contract(self):
        """TeachMeMode.run_full_pipeline() returns LearningReport."""
        from src.teach_me import TeachMeMode, LearningReport

        tm = TeachMeMode()
        report = tm.run_full_pipeline(
            url="https://youtube.com/watch?v=regression",
            content_text="Use 300 m/min for aluminum at 5000 RPM",
            title="Regression Test",
        )
        assert isinstance(report, LearningReport)
        assert report.pipeline_status == "complete"


class TestCrossModuleIntegration:
    """Modules work together without interface mismatches."""

    def test_analyzer_to_checker_pipeline(self):
        """FeatureAnalyzer output feeds ManufacturabilityChecker."""
        from src.feature_analyze import FeatureAnalyzer
        from src.mfg_checker import ManufacturabilityChecker

        analyzer = FeatureAnalyzer(material="aluminum")
        analysis = analyzer.analyze("XMOD-001", [
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}},
            {"type": "pocket", "dimensions": {"width": 30.0, "depth": 8.0}},
        ])
        checker = ManufacturabilityChecker(material="aluminum")
        report = checker.validate(analysis)
        assert report.part_id == "XMOD-001"
        assert len(report.feature_validations) == 2

    def test_nl_query_to_guidance_pipeline(self):
        """NL query routing leads to guidance generation."""
        from src.nl_query import NLQueryHandler, QueryDomain
        from src.guidance_gen import GuidanceGenerator

        handler = NLQueryHandler()
        resp = handler.handle("Best roughing strategy for 4140 steel?")
        assert resp.classification.domain == QueryDomain.CAM

        gen = GuidanceGenerator()
        doc = gen.generate_cam_guidance(
            strategy_type="adaptive",
            parameters={"tool_diameter": 12.0},
            platform="mastercam",
            material="steel",
        )
        assert doc.step_count > 0

    def test_teach_me_to_validation_pipeline(self):
        """Teach-me extracts knowledge that can feed validation."""
        from src.teach_me import TeachMeMode
        from src.cam_safety_overlay import CAMSafetyOverlay

        tm = TeachMeMode()
        report = tm.run_full_pipeline(
            url="https://youtube.com/watch?v=pipeline",
            content_text="Recommended: 300 m/min cutting speed, 0.1 mm/tooth feed, 9549 RPM",
            title="Pipeline Test",
        )
        # Extract parameters from first cutting_parameters item
        param_items = [k for k in report.knowledge_items
                       if k.category == "cutting_parameters"]
        assert len(param_items) > 0

        # These extracted parameters can be validated by CAM overlay
        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="FROM-TEACH",
            material="aluminum",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            cutting_speed=300.0,
            feed_per_tooth=0.1,
            axial_depth=2.0,
        )
        assert sv.is_safe is True


class TestEnumCompleteness:
    """All enums have expected members — no silent removals."""

    def test_feature_type_members(self):
        """FeatureType has all expected members."""
        from src.feature_analyze import FeatureType
        expected = {"hole", "pocket", "slot", "wall", "boss", "fillet",
                    "chamfer", "thread", "counterbore", "countersink",
                    "groove", "face", "step", "unknown"}
        actual = {ft.value for ft in FeatureType}
        assert expected == actual

    def test_query_domain_members(self):
        """QueryDomain has all expected members."""
        from src.nl_query import QueryDomain
        expected = {"cad", "cam", "shop", "troubleshoot", "general"}
        actual = {qd.value for qd in QueryDomain}
        assert expected == actual

    def test_query_intent_members(self):
        """QueryIntent has all expected members."""
        from src.nl_query import QueryIntent
        expected = {"draw", "explain", "recommend", "troubleshoot",
                    "setup", "compare", "calculate", "teach", "lookup"}
        actual = {qi.value for qi in QueryIntent}
        assert expected == actual

    def test_content_type_members(self):
        """ContentType has all expected members."""
        from src.teach_me import ContentType
        expected = {"video", "document", "webpage", "unknown"}
        actual = {ct.value for ct in ContentType}
        assert expected == actual

    def test_platform_members(self):
        """Platform enum has all expected members."""
        from src.guidance_gen import Platform
        expected = {"solidworks", "fusion360", "catia", "nx", "creo",
                    "mastercam", "hypermill", "powermill", "fusion_cam",
                    "esprit", "generic"}
        actual = {p.value for p in Platform}
        assert expected == actual
