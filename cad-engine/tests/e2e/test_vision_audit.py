"""E2E Test: Vision Audit — CC-MS11.

Compares vision-only extraction (simulated screen content with parameters,
UI elements, feature trees) versus transcript-only extraction to quantify
the unique contribution of visual information.

In the real system, vision extracts UI screenshots with OCR. Here we
simulate the difference by providing structured visual data vs plain text.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from src.teach_me import TeachMeMode, classify_content_domain


class TestVisionVsTranscript:
    """Compare vision-only vs transcript-only extraction."""

    def _vision_content(self) -> str:
        """Simulated vision-extracted content (UI elements, parameters, menus)."""
        return """
        [SolidWorks Feature Manager]
        Boss-Extrude1: depth=50.00mm, direction=one-side
        Cut-Extrude1: depth=10.00mm, through-all
        Hole Wizard: diameter=8.00mm, depth=20.00mm, count=4
        Fillet1: radius=3.00mm, edges=12
        Chamfer1: distance=1.00mm, angle=45deg

        [CAM Parameters Panel - Mastercam]
        Operation: 2D Pocket
        Tool: D10mm 4-flute carbide endmill
        Cutting speed: 300 m/min
        Feed per tooth: 0.1 mm/tooth
        Spindle RPM: 9549
        Axial depth: 2.0 mm
        Stepover: 5.0 mm (50%)
        Coolant: Flood

        [Machine Display]
        Current RPM: 9549
        Feed rate: 3820 mm/min
        Tool length offset: H01 = 87.342mm
        Work offset: G54 X0.000 Y0.000 Z0.000

        [Setup Photo Analysis]
        Workpiece clamped in 6" Kurt vise
        Parallels visible under workpiece
        Flood coolant nozzle aimed at cutting zone
        Chip guard in place
        """

    def _transcript_content(self) -> str:
        """Simulated transcript-only content (speech, no visual details)."""
        return """
        Today we're going to make a bracket. First I'm going to sketch
        the profile and then extrude it. After that we'll add some holes
        for mounting. Then we'll do the machining.
        For the roughing operation I like to use adaptive clearing
        because it keeps the tool engagement constant.
        Make sure you set up your vise properly and use coolant.
        The surface finish came out great on this one.
        """

    def test_vision_extracts_more_parameters(self):
        """Vision content yields more extracted knowledge items."""
        tm = TeachMeMode()
        vision_report = tm.run_full_pipeline(
            url="https://youtube.com/watch?v=vision-test",
            content_text=self._vision_content(),
            title="Vision Test",
        )
        transcript_report = tm.run_full_pipeline(
            url="https://youtube.com/watch?v=transcript-test",
            content_text=self._transcript_content(),
            title="Transcript Test",
        )
        # Vision should extract more items (specific parameters visible on screen)
        assert vision_report.extracted_count > transcript_report.extracted_count

    def test_vision_extracts_specific_speeds(self):
        """Vision detects exact cutting speed values from UI panels."""
        tm = TeachMeMode()
        report = tm.run_full_pipeline(
            url="https://youtube.com/watch?v=speed-vision",
            content_text=self._vision_content(),
            title="Speed Vision",
        )
        speed_items = [k for k in report.knowledge_items
                       if "speed" in k.title.lower() or "m/min" in k.content.lower()]
        assert len(speed_items) > 0, "Vision should extract cutting speed from UI"

    def test_vision_extracts_rpm(self):
        """Vision detects RPM from machine display."""
        tm = TeachMeMode()
        report = tm.run_full_pipeline(
            url="https://youtube.com/watch?v=rpm-vision",
            content_text=self._vision_content(),
            title="RPM Vision",
        )
        rpm_items = [k for k in report.knowledge_items
                     if "rpm" in k.title.lower() or "rpm" in k.content.lower()]
        assert len(rpm_items) > 0, "Vision should extract RPM from machine display"

    def test_transcript_lacks_specific_values(self):
        """Transcript alone misses exact parameter values."""
        tm = TeachMeMode()
        report = tm.run_full_pipeline(
            url="https://youtube.com/watch?v=transcript-only",
            content_text=self._transcript_content(),
            title="Transcript Only",
        )
        # Transcript has no specific numeric parameters
        param_items = [k for k in report.knowledge_items
                       if k.category == "cutting_parameters"]
        # Should have zero or very few specific cutting parameters
        assert len(param_items) == 0, "Transcript alone shouldn't have cutting parameters"

    def test_vision_unique_contribution_over_60_pct(self):
        """Vision contributes > 60% unique information vs transcript."""
        tm = TeachMeMode()
        vision_report = tm.run_full_pipeline(
            url="https://youtube.com/watch?v=unique-test",
            content_text=self._vision_content(),
            title="Vision",
        )
        transcript_report = tm.run_full_pipeline(
            url="https://youtube.com/watch?v=unique-transcript",
            content_text=self._transcript_content(),
            title="Transcript",
        )
        vision_count = vision_report.extracted_count
        transcript_count = transcript_report.extracted_count

        # Unique contribution = items in vision not in transcript
        unique_vision = max(vision_count - transcript_count, 0)
        total = max(vision_count, 1)
        contribution_pct = (unique_vision / total) * 100

        assert contribution_pct >= 60, (
            f"Vision unique contribution {contribution_pct:.0f}% < 60% required "
            f"(vision={vision_count}, transcript={transcript_count})"
        )


class TestDomainClassification:
    """Content domain classification works for diverse content."""

    def test_cad_content_classified(self):
        """Content with CAD keywords classified to CAD domain."""
        domains = classify_content_domain(
            "Open SolidWorks, create a sketch, extrude the profile 50mm"
        )
        assert "cad" in domains

    def test_cam_content_classified(self):
        """Content with CAM keywords classified to CAM domain."""
        domains = classify_content_domain(
            "Set up the toolpath in Mastercam, use adaptive roughing strategy"
        )
        assert "cam" in domains

    def test_shop_content_classified(self):
        """Content with shop keywords classified to SHOP domain."""
        domains = classify_content_domain(
            "Set up the workpiece in the vise with coolant running"
        )
        assert "shop" in domains

    def test_multi_domain_content(self):
        """Content spanning multiple domains gets all classified."""
        domains = classify_content_domain(
            "In SolidWorks, create the sketch, then set up the toolpath "
            "in Mastercam with proper workholding in the vise"
        )
        assert len(domains) >= 2

    def test_safety_content_classified(self):
        """Safety-related content classified correctly."""
        domains = classify_content_domain(
            "Always wear eye protection and engage the emergency stop guard"
        )
        assert "safety" in domains

    def test_material_content_classified(self):
        """Material knowledge content classified correctly."""
        domains = classify_content_domain(
            "The alloy has excellent machinability with high tensile strength"
        )
        assert "material" in domains
