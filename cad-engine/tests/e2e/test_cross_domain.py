"""E2E Test: Cross-Domain Pipeline — CC-MS11.

Tests that a single workflow can span CAD, CAM, and SHOP domains
with consistent validation throughout.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from src.feature_analyze import FeatureAnalyzer, FeatureType
from src.mfg_checker import ManufacturabilityChecker, SAFETY_THRESHOLD as MFG_THRESH
from src.cam_safety_overlay import CAMSafetyOverlay, SAFETY_THRESHOLD as CAM_THRESH
from src.shop_safety_validator import ShopSafetyValidator, SAFETY_THRESHOLD as SHOP_THRESH
from src.nl_query import NLQueryHandler, QueryDomain
from src.guidance_gen import GuidanceGenerator
from src.teach_me import TeachMeMode


class TestCrossDomainPipeline:
    """Full cross-domain pipeline test."""

    def test_part_through_all_stages(self):
        """Part definition -> CAD analysis -> CAM overlay -> SHOP validation."""
        # Stage 1: CAD Feature Analysis
        analyzer = FeatureAnalyzer(material="aluminum")
        features = [
            {"type": "pocket", "dimensions": {"width": 30.0, "depth": 8.0}},
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}},
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}},
            {"type": "fillet", "dimensions": {"radius": 2.0}},
        ]
        analysis = analyzer.analyze("CROSS-001", features)
        assert analysis.feature_count == 4

        # Stage 2: Manufacturability Validation
        checker = ManufacturabilityChecker(material="aluminum")
        mfg_report = checker.validate(analysis)
        assert mfg_report.blocked is False
        assert mfg_report.overall_safety_score >= MFG_THRESH

        # Stage 3: CAM Parameter Validation
        overlay = CAMSafetyOverlay()
        cam_report = overlay.validate_all([
            {
                "strategy_id": "POCKET-STRAT",
                "material": "aluminum",
                "operation_type": "pocket_2d",
                "parameters": {
                    "tool_diameter": 10.0,
                    "cutting_speed": 300.0,
                    "feed_per_tooth": 0.1,
                    "axial_depth": 2.0,
                },
            },
            {
                "strategy_id": "DRILL-STRAT",
                "material": "aluminum",
                "operation_type": "drilling",
                "parameters": {
                    "tool_diameter": 10.0,
                    "cutting_speed": 200.0,
                    "feed_per_tooth": 0.10,
                    "axial_depth": 10.0,
                },
            },
        ])
        assert cam_report.blocked is False

        # Stage 4: Shop Practice Validation
        validator = ShopSafetyValidator()
        shop_report = validator.validate_all([{
            "practice_id": "SHOP-CROSS-001",
            "title": "Aluminum Pocket + Drilling",
            "category": "milling",
            "description": "Mill pocket and drill holes in 6061 aluminum.",
            "steps": ["Clamp part", "Face mill", "Pocket", "Drill 2x holes"],
            "warnings": ["Wear eye protection"],
            "applicable_materials": ["aluminum"],
        }])
        assert shop_report.blocked is False

    def test_safety_threshold_consistent(self):
        """S(x) >= 0.70 threshold is identical across all modules."""
        assert MFG_THRESH == 0.70
        assert CAM_THRESH == 0.70
        assert SHOP_THRESH == 0.70

    def test_nl_queries_route_to_all_domains(self):
        """Verify NL queries correctly route to each domain."""
        handler = NLQueryHandler()
        cases = [
            ("Draw me a bearing block", QueryDomain.CAD),
            ("Best strategy for roughing 4140?", QueryDomain.CAM),
            ("How do I set up the vise?", QueryDomain.SHOP),
            ("I'm getting chatter", QueryDomain.TROUBLESHOOT),
        ]
        for query, expected_domain in cases:
            resp = handler.handle(query)
            assert resp.classification.domain == expected_domain

    def test_teach_me_extracts_across_domains(self):
        """Teach-me pipeline extracts knowledge from multi-domain content."""
        tm = TeachMeMode()
        content = """
        This tutorial covers complete part manufacturing:
        1. In SolidWorks, create a sketch and extrude a 50mm block
        2. Set feeds and speeds: 300 m/min for aluminum roughing
        3. Use 5000 RPM spindle speed
        4. Clamp the workpiece in the vise with parallels
        5. Always wear eye protection during machining
        Tip: Use flood coolant for best surface finish
        Note: Aluminum has excellent machinability
        """
        report = tm.run_full_pipeline(
            url="https://youtube.com/watch?v=cross-domain",
            content_text=content,
            title="Complete Part Manufacturing",
        )
        assert report.pipeline_status == "complete"
        assert report.extracted_count > 0
        # Should cover multiple domains
        assert len(report.domains_covered) >= 2

    def test_guidance_for_multiple_platforms(self):
        """Same operation generates correct paths for different platforms."""
        gen = GuidanceGenerator()
        platforms = ["solidworks", "fusion360", "catia", "nx", "creo"]
        for plat in platforms:
            doc = gen.generate_cad_guidance(
                operation="extrude",
                parameters={"depth": 20.0},
                platform=plat,
            )
            assert doc.platform == plat
            assert doc.step_count > 0
            menu_steps = [s for s in doc.steps if s.menu_path]
            assert len(menu_steps) > 0, f"No menu paths for {plat}"
