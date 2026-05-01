"""E2E Test: Boot Integration — CC-MS11.

Simulates restart -> module load -> query succeeds using
loaded modules. Verifies all modules import successfully
and can handle queries immediately after initialization.
"""

from __future__ import annotations

import importlib
import os
import sys
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))


class TestModuleBootstrap:
    """All CC modules import and initialize within time limits."""

    def test_feature_analyze_imports(self):
        """feature_analyze imports without error."""
        mod = importlib.import_module("src.feature_analyze")
        assert hasattr(mod, "FeatureAnalyzer")
        assert hasattr(mod, "FeatureType")
        assert hasattr(mod, "FeatureAnalysisResult")

    def test_mfg_checker_imports(self):
        """mfg_checker imports without error."""
        mod = importlib.import_module("src.mfg_checker")
        assert hasattr(mod, "ManufacturabilityChecker")
        assert hasattr(mod, "SAFETY_THRESHOLD")
        assert mod.SAFETY_THRESHOLD == 0.70

    def test_cam_safety_overlay_imports(self):
        """cam_safety_overlay imports without error."""
        mod = importlib.import_module("src.cam_safety_overlay")
        assert hasattr(mod, "CAMSafetyOverlay")
        assert hasattr(mod, "SAFETY_THRESHOLD")
        assert mod.SAFETY_THRESHOLD == 0.70

    def test_shop_safety_validator_imports(self):
        """shop_safety_validator imports without error."""
        mod = importlib.import_module("src.shop_safety_validator")
        assert hasattr(mod, "ShopSafetyValidator")
        assert hasattr(mod, "SAFETY_THRESHOLD")
        assert mod.SAFETY_THRESHOLD == 0.70

    def test_nl_query_imports(self):
        """nl_query imports without error."""
        mod = importlib.import_module("src.nl_query")
        assert hasattr(mod, "NLQueryHandler")
        assert hasattr(mod, "QueryDomain")
        assert hasattr(mod, "QueryIntent")

    def test_guidance_gen_imports(self):
        """guidance_gen imports without error."""
        mod = importlib.import_module("src.guidance_gen")
        assert hasattr(mod, "GuidanceGenerator")
        assert hasattr(mod, "GuidanceDocument")
        assert hasattr(mod, "Platform")

    def test_teach_me_imports(self):
        """teach_me imports without error."""
        mod = importlib.import_module("src.teach_me")
        assert hasattr(mod, "TeachMeMode")
        assert hasattr(mod, "ContentType")
        assert hasattr(mod, "LearningDomain")


class TestBootSequence:
    """Full boot sequence: import all -> initialize -> query."""

    def test_full_boot_under_2_seconds(self):
        """All modules import and initialize within 2 seconds."""
        start = time.perf_counter()

        from src.feature_analyze import FeatureAnalyzer
        from src.mfg_checker import ManufacturabilityChecker
        from src.cam_safety_overlay import CAMSafetyOverlay
        from src.shop_safety_validator import ShopSafetyValidator
        from src.nl_query import NLQueryHandler
        from src.guidance_gen import GuidanceGenerator
        from src.teach_me import TeachMeMode

        # Initialize all modules
        analyzer = FeatureAnalyzer(material="steel")
        checker = ManufacturabilityChecker(material="steel")
        overlay = CAMSafetyOverlay()
        validator = ShopSafetyValidator()
        handler = NLQueryHandler()
        gen = GuidanceGenerator()
        tm = TeachMeMode()

        elapsed = time.perf_counter() - start
        assert elapsed < 2.0, f"Boot took {elapsed:.2f}s — exceeds 2s limit"

    def test_query_succeeds_after_boot(self):
        """NL query succeeds immediately after initialization."""
        from src.nl_query import NLQueryHandler, QueryDomain

        handler = NLQueryHandler()
        resp = handler.handle("Draw me a bearing block with 4 mounting holes")
        assert resp.classification.domain == QueryDomain.CAD
        assert resp.validation_status == "validated"
        assert len(resp.sources) > 0

    def test_cad_pipeline_after_boot(self):
        """Full CAD pipeline works immediately after boot."""
        from src.feature_analyze import FeatureAnalyzer
        from src.mfg_checker import ManufacturabilityChecker

        analyzer = FeatureAnalyzer(material="aluminum")
        analysis = analyzer.analyze("BOOT-001", [
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}},
        ])
        assert analysis.feature_count == 1

        checker = ManufacturabilityChecker(material="aluminum")
        report = checker.validate(analysis)
        assert report.blocked is False

    def test_cam_pipeline_after_boot(self):
        """CAM validation works immediately after boot."""
        from src.cam_safety_overlay import CAMSafetyOverlay

        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="BOOT-CAM",
            material="aluminum",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            cutting_speed=300.0,
            feed_per_tooth=0.1,
            axial_depth=2.0,
        )
        assert sv.is_safe is True

    def test_shop_pipeline_after_boot(self):
        """Shop validation works immediately after boot."""
        from src.shop_safety_validator import ShopSafetyValidator

        validator = ShopSafetyValidator()
        pv = validator.validate_practice({
            "practice_id": "BOOT-SHOP",
            "title": "Standard Milling",
            "category": "milling",
            "description": "Face mill aluminum at 3000 RPM with flood coolant.",
            "steps": ["Clamp part"],
            "warnings": ["Wear safety glasses"],
            "applicable_materials": ["aluminum"],
        })
        assert pv.is_safe is True

    def test_guidance_after_boot(self):
        """Guidance generation works immediately after boot."""
        from src.guidance_gen import GuidanceGenerator

        gen = GuidanceGenerator()
        doc = gen.generate_cad_guidance(
            operation="extrude",
            parameters={"depth": 20.0},
            platform="solidworks",
        )
        assert doc.step_count > 0
        assert doc.platform == "solidworks"

    def test_teach_me_after_boot(self):
        """Teach-me pipeline works immediately after boot."""
        from src.teach_me import TeachMeMode

        tm = TeachMeMode()
        report = tm.run_full_pipeline(
            url="https://youtube.com/watch?v=boot-test",
            content_text="Use 300 m/min for aluminum roughing at 5000 RPM",
            title="Boot Test",
        )
        assert report.pipeline_status == "complete"
        assert report.extracted_count > 0
