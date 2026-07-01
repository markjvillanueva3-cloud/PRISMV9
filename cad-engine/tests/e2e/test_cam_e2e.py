"""E2E Test: CAM Domain Pipeline — CC-MS11.

Strategy parameters -> CAM safety overlay -> Validated recommendation.
Tests the full CAM validation path end-to-end.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from src.cam_safety_overlay import CAMSafetyOverlay, SAFETY_THRESHOLD
from src.nl_query import NLQueryHandler, QueryDomain
from src.guidance_gen import GuidanceGenerator


class TestCAMEndToEnd:
    """Full CAM pipeline: strategy -> overlay validation -> guidance."""

    def test_aluminum_pocket_safe(self):
        """Conservative aluminum pocket milling passes all checks."""
        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="ALU-POCKET-001",
            material="aluminum",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            cutting_speed=300.0,
            feed_per_tooth=0.1,
            axial_depth=2.0,
            spindle_rpm=9549,
        )
        assert sv.is_safe is True
        assert sv.safety_score >= SAFETY_THRESHOLD
        assert sv.cutting_force_N > 0
        assert sv.cutting_power_kW > 0

    def test_steel_adaptive_with_validation(self):
        """Steel adaptive clearing with aggressive but safe parameters."""
        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="STEEL-ADAPT-001",
            material="steel",
            operation_type="adaptive",
            tool_diameter=12.0,
            cutting_speed=100.0,
            feed_per_tooth=0.06,
            axial_depth=12.0,  # 1.0xD — conservative adaptive
            spindle_rpm=2653,
        )
        assert sv.is_safe is True
        assert sv.cutting_force_N > 0

    def test_titanium_requires_coolant_context(self):
        """Titanium machining should pass overlay if params are conservative."""
        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="TI-001",
            material="titanium",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            cutting_speed=35.0,
            feed_per_tooth=0.04,
            axial_depth=0.5,
            spindle_rpm=1114,
        )
        assert sv.is_safe is True

    def test_batch_validation_mixed_results(self):
        """Batch of strategies with safe and unsafe parameters."""
        overlay = CAMSafetyOverlay(max_spindle_rpm=12000)
        strategies = [
            {
                "strategy_id": "SAFE-1",
                "material": "aluminum",
                "operation_type": "face_mill",
                "parameters": {
                    "tool_diameter": 50.0,
                    "cutting_speed": 400.0,
                    "feed_per_tooth": 0.15,
                    "axial_depth": 2.0,
                },
            },
            {
                "strategy_id": "UNSAFE-1",
                "material": "inconel",
                "operation_type": "pocket_2d",
                "parameters": {
                    "tool_diameter": 10.0,
                    "cutting_speed": 200.0,  # Way above inconel max 50
                    "feed_per_tooth": 0.3,
                    "axial_depth": 10.0,
                    "spindle_rpm": 15000,  # Above max
                },
            },
        ]
        report = overlay.validate_all(strategies)
        assert report.total_strategies == 2
        assert report.validated == 2
        assert report.failed >= 1

    def test_nl_query_to_cam_guidance(self):
        """NL query -> CAM routing -> guidance generation."""
        handler = NLQueryHandler()
        resp = handler.handle("Best roughing strategy for 4140 steel?")
        assert resp.classification.domain == QueryDomain.CAM

        gen = GuidanceGenerator()
        doc = gen.generate_cam_guidance(
            strategy_type="adaptive",
            parameters={"tool_diameter": 12.0, "cutting_speed": 150.0,
                        "feed_per_tooth": 0.08, "axial_depth": 15.0},
            platform="mastercam",
            material="steel",
        )
        assert doc.step_count >= 5
        assert any("Toolpaths" in s.menu_path for s in doc.steps if s.menu_path)

    def test_kienzle_force_consistency(self):
        """Verify Kienzle force model produces consistent results."""
        overlay = CAMSafetyOverlay()
        # Same params, different materials should give different forces
        sv_alu = overlay.validate_strategy(
            strategy_id="FORCE-ALU", material="aluminum",
            operation_type="pocket_2d", tool_diameter=10.0,
            feed_per_tooth=0.1, axial_depth=3.0, spindle_rpm=5000,
        )
        sv_steel = overlay.validate_strategy(
            strategy_id="FORCE-STEEL", material="steel",
            operation_type="pocket_2d", tool_diameter=10.0,
            feed_per_tooth=0.1, axial_depth=3.0, spindle_rpm=5000,
        )
        # Steel has higher kc1.1 -> higher force
        assert sv_steel.cutting_force_N > sv_alu.cutting_force_N
