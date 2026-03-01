"""E2E Test: CAD Domain Pipeline — CC-MS11.

Feature description -> Feature analysis -> Manufacturability check -> Report.
Tests the full CAD validation path end-to-end.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from src.feature_analyze import FeatureAnalyzer, FeatureType
from src.mfg_checker import ManufacturabilityChecker, SAFETY_THRESHOLD
from src.nl_query import NLQueryHandler, QueryDomain


class TestCADEndToEnd:
    """Full CAD pipeline: NL query -> feature analysis -> mfg validation."""

    def test_bearing_block_pipeline(self):
        """Bearing block: 4 holes + 1 pocket -> analyze -> validate."""
        analyzer = FeatureAnalyzer(material="steel")
        features = [
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 25.0}},
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 25.0}},
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 25.0}},
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 25.0}},
            {"type": "pocket", "dimensions": {"width": 40.0, "depth": 5.0}},
        ]
        analysis = analyzer.analyze("BEARING-BLOCK-001", features)
        assert analysis.feature_count == 5
        assert len(analysis.features_by_type(FeatureType.HOLE)) == 4

        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)
        assert report.blocked is False
        assert report.overall_safety_score >= SAFETY_THRESHOLD
        assert report.is_manufacturable is True

    def test_flanged_housing_pipeline(self):
        """Housing with tight-tolerance bore + mounting holes."""
        analyzer = FeatureAnalyzer(material="aluminum")
        features = [
            {"type": "hole", "dimensions": {"diameter": 50.0, "depth": 30.0},
             "tolerances": {"diameter": (0.013, -0.013)}},
            {"type": "hole", "dimensions": {"diameter": 8.0, "depth": 15.0}},
            {"type": "hole", "dimensions": {"diameter": 8.0, "depth": 15.0}},
            {"type": "hole", "dimensions": {"diameter": 8.0, "depth": 15.0}},
            {"type": "hole", "dimensions": {"diameter": 8.0, "depth": 15.0}},
            {"type": "fillet", "dimensions": {"radius": 2.0}},
            {"type": "chamfer", "dimensions": {"radius": 1.0}},
        ]
        analysis = analyzer.analyze("HOUSING-001", features)
        assert analysis.feature_count == 7
        assert len(analysis.critical_features) >= 1  # tight bore

        checker = ManufacturabilityChecker(material="aluminum")
        report = checker.validate(analysis)
        assert report.blocked is False
        # Tight tolerance should assign reaming process
        bore_val = report.feature_validations[0]
        assert bore_val.required_process == "reaming"

    def test_nl_query_routes_to_cad(self):
        """NL query 'Draw me a bearing block' routes to CAD domain."""
        handler = NLQueryHandler()
        resp = handler.handle("Draw me a bearing block with 4 mounting holes")
        assert resp.classification.domain == QueryDomain.CAD
        assert resp.validation_status == "validated"
        assert len(resp.sources) > 0

    def test_serialization_roundtrip(self):
        """All results serialize to dict cleanly."""
        analyzer = FeatureAnalyzer(material="steel")
        analysis = analyzer.analyze("SERIAL-001", [
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}},
        ])
        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)

        d = report.to_dict()
        assert isinstance(d, dict)
        assert d["part_id"] == "SERIAL-001"
        assert isinstance(d["feature_validations"], list)
        assert isinstance(d["overall_safety_score"], float)

    def test_complex_part_with_multiple_feature_types(self):
        """Part with holes, pockets, slots, fillets, threads."""
        analyzer = FeatureAnalyzer(material="mild_steel")
        features = [
            {"type": "pocket", "dimensions": {"width": 30.0, "depth": 10.0}},
            {"type": "slot", "dimensions": {"width": 8.0, "depth": 12.0}},
            {"type": "hole", "dimensions": {"diameter": 6.0, "depth": 15.0}},
            {"type": "thread", "dimensions": {"diameter": 10.0, "depth": 20.0}},
            {"type": "fillet", "dimensions": {"radius": 3.0}},
            {"type": "groove", "dimensions": {"width": 4.0, "depth": 3.0}},
        ]
        analysis = analyzer.analyze("COMPLEX-001", features)
        assert analysis.feature_count == 6

        checker = ManufacturabilityChecker(material="mild_steel")
        report = checker.validate(analysis)
        assert report.blocked is False
        assert report.total_checks > 0
        assert report.passed_checks > 0
