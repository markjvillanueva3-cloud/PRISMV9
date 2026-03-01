"""E2E Test: SHOP Domain Pipeline — CC-MS11.

Practice description -> Safety validation -> Guidance generation.
Tests the full SHOP validation path end-to-end.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from src.shop_safety_validator import ShopSafetyValidator, SAFETY_THRESHOLD
from src.nl_query import NLQueryHandler, QueryDomain
from src.guidance_gen import GuidanceGenerator


class TestShopEndToEnd:
    """Full SHOP pipeline: practice -> validate -> guidance."""

    def test_safe_milling_practice(self):
        """Standard milling practice passes all safety checks."""
        validator = ShopSafetyValidator()
        practice = {
            "practice_id": "E2E-SHOP-001",
            "title": "Standard Aluminum Face Milling",
            "category": "milling",
            "description": "Face mill 6061 aluminum at 3000 RPM with flood coolant.",
            "steps": [
                "Secure workpiece in vise with parallels",
                "Set tool length offset",
                "Set 3000 RPM, engage feed at 500 mm/min",
                "Apply flood coolant",
            ],
            "warnings": ["Wear safety glasses", "Check chip guard before starting"],
            "applicable_materials": ["aluminum"],
            "tips": ["Use climb milling for better surface finish"],
        }
        pv = validator.validate_practice(practice)
        assert pv.is_safe is True
        assert pv.safety_score >= SAFETY_THRESHOLD
        assert len(pv.findings) == 0  # No issues

    def test_unsafe_practice_blocked(self):
        """Practice with 'remove guard' gets blocked."""
        validator = ShopSafetyValidator()
        practice = {
            "practice_id": "E2E-SHOP-002",
            "title": "Quick Setup",
            "category": "setup",
            "description": "Remove guard to see the cut better.",
            "steps": [], "warnings": [],
            "applicable_materials": ["steel"],
        }
        pv = validator.validate_practice(practice)
        assert pv.is_safe is False
        assert any(f.severity == "critical" for f in pv.findings)

    def test_dry_titanium_blocked(self):
        """Dry machining titanium is always blocked (fire risk)."""
        validator = ShopSafetyValidator()
        practice = {
            "practice_id": "E2E-SHOP-003",
            "title": "Titanium Roughing",
            "category": "milling",
            "description": "Rough titanium with no coolant dry machining.",
            "steps": [], "warnings": [],
            "applicable_materials": ["titanium"],
        }
        pv = validator.validate_practice(practice)
        assert pv.is_safe is False
        coolant = [f for f in pv.findings if f.category == "coolant"]
        assert len(coolant) > 0

    def test_batch_practices_report(self):
        """Batch of practices produces correct report counts."""
        validator = ShopSafetyValidator()
        practices = [
            {
                "practice_id": "BATCH-1", "title": "Safe",
                "category": "milling",
                "description": "Standard safe practice at 3000 RPM.",
                "steps": [], "warnings": ["Be careful"],
                "applicable_materials": ["aluminum"],
            },
            {
                "practice_id": "BATCH-2", "title": "Unsafe",
                "category": "setup",
                "description": "Bypass interlock for speed.",
                "steps": [], "warnings": [],
                "applicable_materials": [],
            },
        ]
        report = validator.validate_all(practices)
        assert report.total_practices == 2
        assert report.safe_count >= 1
        assert report.unsafe_count >= 1
        assert len(report.critical_findings) >= 1

    def test_nl_query_to_shop_guidance(self):
        """NL shop query -> route -> guidance generation."""
        handler = NLQueryHandler()
        resp = handler.handle("How do I set up the vise for milling?")
        assert resp.classification.domain == QueryDomain.SHOP

        gen = GuidanceGenerator()
        doc = gen.generate_cad_guidance(
            operation="sketch",
            parameters={},
            platform="generic",
        )
        assert doc.step_count > 0

    def test_rpm_exceeds_material_limit(self):
        """RPM above material safe limit gets flagged."""
        validator = ShopSafetyValidator(machine_max_rpm=24000)
        practice = {
            "practice_id": "RPM-HIGH",
            "title": "High Speed Steel",
            "category": "milling",
            "description": "Run at 12000 RPM for stainless steel.",
            "steps": [], "warnings": ["Use coolant"],
            "applicable_materials": ["stainless_steel"],
        }
        pv = validator.validate_practice(practice)
        # 12000 > 5000 (stainless max) -> should flag
        rpm_findings = [f for f in pv.findings if "RPM" in f.message]
        assert len(rpm_findings) > 0
