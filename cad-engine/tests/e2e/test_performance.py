"""E2E Test: Performance Benchmarks — CC-MS11.

Measures execution time of key operations against performance targets:
  - Feature analysis: < 50ms per feature
  - Manufacturability check: < 100ms per part
  - CAM validation: < 100ms per strategy
  - Shop validation: < 50ms per practice
  - NL query classification: < 50ms per query
  - Guidance generation: < 50ms per document
  - Teach-me pipeline: < 200ms per run
"""

from __future__ import annotations

import os
import sys
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from src.feature_analyze import FeatureAnalyzer
from src.mfg_checker import ManufacturabilityChecker
from src.cam_safety_overlay import CAMSafetyOverlay
from src.shop_safety_validator import ShopSafetyValidator
from src.nl_query import NLQueryHandler
from src.guidance_gen import GuidanceGenerator
from src.teach_me import TeachMeMode


def _time_ms(fn) -> float:
    """Run fn and return elapsed time in milliseconds."""
    start = time.perf_counter()
    fn()
    return (time.perf_counter() - start) * 1000


class TestFeatureAnalysisPerformance:
    """Feature analysis should be fast even for complex parts."""

    def test_single_feature_under_50ms(self):
        """Single feature analysis completes in < 50ms."""
        analyzer = FeatureAnalyzer(material="steel")
        elapsed = _time_ms(lambda: analyzer.analyze("PERF-001", [
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}},
        ]))
        assert elapsed < 50, f"Single feature took {elapsed:.1f}ms"

    def test_ten_features_under_100ms(self):
        """10-feature analysis completes in < 100ms."""
        analyzer = FeatureAnalyzer(material="steel")
        features = [
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}}
            for _ in range(10)
        ]
        elapsed = _time_ms(lambda: analyzer.analyze("PERF-002", features))
        assert elapsed < 100, f"10 features took {elapsed:.1f}ms"

    def test_fifty_features_under_500ms(self):
        """50-feature complex part analysis completes in < 500ms."""
        analyzer = FeatureAnalyzer(material="steel")
        features = []
        for i in range(50):
            ftype = ["hole", "pocket", "slot", "fillet", "chamfer"][i % 5]
            if ftype == "hole":
                features.append({"type": ftype, "dimensions": {"diameter": 5.0 + i, "depth": 10.0 + i}})
            elif ftype in ("pocket", "slot"):
                features.append({"type": ftype, "dimensions": {"width": 10.0 + i, "depth": 5.0 + i}})
            elif ftype == "fillet":
                features.append({"type": ftype, "dimensions": {"radius": 1.0 + i * 0.1}})
            else:
                features.append({"type": ftype, "dimensions": {"radius": 0.5 + i * 0.1}})

        elapsed = _time_ms(lambda: analyzer.analyze("PERF-003", features))
        assert elapsed < 500, f"50 features took {elapsed:.1f}ms"


class TestManufacturabilityPerformance:
    """Manufacturability checking should be fast."""

    def test_simple_part_under_100ms(self):
        """Simple part validation completes in < 100ms."""
        analyzer = FeatureAnalyzer(material="steel")
        analysis = analyzer.analyze("MFG-PERF-001", [
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}},
            {"type": "pocket", "dimensions": {"width": 30.0, "depth": 8.0}},
        ])
        checker = ManufacturabilityChecker(material="steel")
        elapsed = _time_ms(lambda: checker.validate(analysis))
        assert elapsed < 100, f"MFG check took {elapsed:.1f}ms"

    def test_complex_part_under_200ms(self):
        """Complex part (20 features) validation completes in < 200ms."""
        analyzer = FeatureAnalyzer(material="steel")
        features = [
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}}
            for _ in range(20)
        ]
        analysis = analyzer.analyze("MFG-PERF-002", features)
        checker = ManufacturabilityChecker(material="steel")
        elapsed = _time_ms(lambda: checker.validate(analysis))
        assert elapsed < 200, f"Complex MFG check took {elapsed:.1f}ms"


class TestCAMPerformance:
    """CAM validation should be fast."""

    def test_single_strategy_under_100ms(self):
        """Single strategy validation completes in < 100ms."""
        overlay = CAMSafetyOverlay()
        elapsed = _time_ms(lambda: overlay.validate_strategy(
            strategy_id="CAM-PERF-001",
            material="aluminum",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            cutting_speed=300.0,
            feed_per_tooth=0.1,
            axial_depth=2.0,
            spindle_rpm=9549,
        ))
        assert elapsed < 100, f"CAM validation took {elapsed:.1f}ms"

    def test_batch_ten_strategies_under_500ms(self):
        """Batch of 10 strategies validates in < 500ms."""
        overlay = CAMSafetyOverlay()
        strategies = [{
            "strategy_id": f"BATCH-{i}",
            "material": "aluminum",
            "operation_type": "pocket_2d",
            "parameters": {
                "tool_diameter": 10.0, "cutting_speed": 300.0,
                "feed_per_tooth": 0.1, "axial_depth": 2.0,
            },
        } for i in range(10)]
        elapsed = _time_ms(lambda: overlay.validate_all(strategies))
        assert elapsed < 500, f"Batch CAM took {elapsed:.1f}ms"


class TestShopPerformance:
    """Shop practice validation should be fast."""

    def test_single_practice_under_50ms(self):
        """Single practice validation completes in < 50ms."""
        validator = ShopSafetyValidator()
        elapsed = _time_ms(lambda: validator.validate_practice({
            "practice_id": "SHOP-PERF-001",
            "title": "Standard Milling",
            "category": "milling",
            "description": "Face mill aluminum at 3000 RPM with flood coolant.",
            "steps": ["Clamp part", "Set tool length"],
            "warnings": ["Wear safety glasses"],
            "applicable_materials": ["aluminum"],
        }))
        assert elapsed < 50, f"Shop validation took {elapsed:.1f}ms"

    def test_batch_twenty_practices_under_500ms(self):
        """Batch of 20 practices validates in < 500ms."""
        validator = ShopSafetyValidator()
        practices = [{
            "practice_id": f"BATCH-{i}",
            "title": f"Practice {i}",
            "category": "milling",
            "description": f"Standard milling operation {i} at 3000 RPM.",
            "steps": ["Clamp"],
            "warnings": ["Be careful"],
            "applicable_materials": ["aluminum"],
        } for i in range(20)]
        elapsed = _time_ms(lambda: validator.validate_all(practices))
        assert elapsed < 500, f"Batch shop took {elapsed:.1f}ms"


class TestNLQueryPerformance:
    """NL query classification should be fast."""

    def test_single_query_under_50ms(self):
        """Single NL query classification completes in < 50ms."""
        handler = NLQueryHandler()
        elapsed = _time_ms(lambda: handler.handle("Draw me a bearing block"))
        assert elapsed < 50, f"NL query took {elapsed:.1f}ms"

    def test_ten_queries_under_200ms(self):
        """10 NL queries classify in < 200ms total."""
        handler = NLQueryHandler()
        queries = [
            "Draw me a bearing block",
            "Best roughing strategy for 4140?",
            "How do I set up the vise?",
            "I'm getting chatter",
            "What RPM for aluminum with 10mm endmill?",
            "Teach me from this video",
            "Compare climb vs conventional milling",
            "Show me titanium properties",
            "What is a fillet?",
            "How to reduce vibration?",
        ]

        def run_all():
            for q in queries:
                handler.handle(q)

        elapsed = _time_ms(run_all)
        assert elapsed < 200, f"10 queries took {elapsed:.1f}ms"


class TestGuidancePerformance:
    """Guidance generation should be fast."""

    def test_cad_guidance_under_50ms(self):
        """CAD guidance generation completes in < 50ms."""
        gen = GuidanceGenerator()
        elapsed = _time_ms(lambda: gen.generate_cad_guidance(
            operation="extrude",
            parameters={"depth": 20.0},
            platform="solidworks",
        ))
        assert elapsed < 50, f"CAD guidance took {elapsed:.1f}ms"

    def test_cam_guidance_under_50ms(self):
        """CAM guidance generation completes in < 50ms."""
        gen = GuidanceGenerator()
        elapsed = _time_ms(lambda: gen.generate_cam_guidance(
            strategy_type="adaptive",
            parameters={"tool_diameter": 12.0, "cutting_speed": 150.0},
            platform="mastercam",
            material="steel",
        ))
        assert elapsed < 50, f"CAM guidance took {elapsed:.1f}ms"


class TestTeachMePerformance:
    """Teach-me pipeline should complete quickly."""

    def test_full_pipeline_under_200ms(self):
        """Full teach-me pipeline completes in < 200ms."""
        tm = TeachMeMode()
        content = """
        This tutorial covers aluminum machining:
        1. Set cutting speed to 300 m/min
        2. Use 5000 RPM spindle speed
        3. Feed per tooth 0.1 mm/tooth
        4. Apply flood coolant
        Tip: Use climb milling for better finish
        Note: Aluminum has excellent machinability
        """
        elapsed = _time_ms(lambda: tm.run_full_pipeline(
            url="https://youtube.com/watch?v=perf-test",
            content_text=content,
            title="Performance Test",
        ))
        assert elapsed < 200, f"Teach-me pipeline took {elapsed:.1f}ms"
