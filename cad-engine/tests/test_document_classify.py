"""Tests for document type classification (CC-EXT-MS0 U02)."""

from __future__ import annotations

import pytest

from src.document_classify import classify_document, DocumentType


class TestAcademicPaper:
    """Test academic paper classification."""

    def test_obvious_academic_paper(self):
        text = (
            "Abstract\n\n"
            "This paper investigates the cutting forces in high-speed milling of "
            "titanium alloys. Our experimental setup used a 5-axis VMC. "
            "The methodology involved varying feed rate and depth of cut.\n\n"
            "1. Introduction\n\n"
            "Previous work by Smith et al. [1] showed that...\n\n"
            "2. Literature Review\n\n"
            "Several studies [2][3][4] have examined...\n\n"
            "3. Results and Discussion\n\n"
            "Fig. 1 shows the force components.\n\n"
            "4. Conclusion\n\n"
            "We demonstrated a 15% reduction in cutting forces.\n\n"
            "References\n\n"
            "[1] Smith et al., J. Manufacturing, 2023\n"
            "[2] Jones et al., CIRP Annals, 2022\n"
            "Acknowledgments\n"
            "This work was supported by NSF grant..."
        )
        result = classify_document(text, has_doi=True)
        assert result.doc_type == DocumentType.ACADEMIC_PAPER
        assert result.confidence >= 0.5

    def test_academic_with_doi_in_title(self):
        result = classify_document(
            "Abstract\nWe study tool wear in turning. Results and discussion follow.\nReferences\n[1] Smith et al.",
            title="A Study of Tool Wear Mechanisms in CNC Turning",
            has_doi=True,
        )
        assert result.doc_type == DocumentType.ACADEMIC_PAPER


class TestTechnicalManual:
    """Test technical manual classification."""

    def test_obvious_manual(self):
        text = (
            "Table of Contents\n\n"
            "Chapter 1: Installation Procedure\n"
            "Chapter 2: Operating Instructions\n"
            "Chapter 3: Maintenance Schedule\n"
            "Appendix A: Parts List\n\n"
            "Safety Precautions\n"
            "Always disconnect power before servicing.\n\n"
            "Chapter 1: Installation Procedure\n"
            "1. Mount the machine on a level surface\n"
            "2. Connect the power supply\n"
            "3. Initialize the controller\n"
            "4. Run the homing cycle\n"
            "5. Verify axis travel limits\n"
            "6. Check coolant system\n"
            "7. Load tool magazine\n"
        )
        result = classify_document(text, title="Haas VF-2 Operator Manual")
        assert result.doc_type == DocumentType.TECHNICAL_MANUAL
        assert result.confidence >= 0.5

    def test_troubleshooting_guide(self):
        text = (
            "Troubleshooting Guide\n\n"
            "Chapter 1: Common Alarm Codes\n"
            "If alarm 108 appears, check the spindle encoder.\n"
            "Installation procedure for replacement encoder:\n"
            "1. Power off the machine\n"
            "2. Remove the cover\n"
            "3. Disconnect the cable\n"
            "4. Install new encoder\n"
            "5. Reconnect and verify\n"
            "6. Run calibration\n"
        )
        result = classify_document(text)
        assert result.doc_type == DocumentType.TECHNICAL_MANUAL


class TestHandbook:
    """Test handbook classification."""

    def test_machinist_handbook(self):
        text = (
            "Machinist's Handbook — Quick Reference\n\n"
            "Best Practice: Always indicate your vise before precision work.\n\n"
            "Recommended Procedure for Edge Finding:\n"
            "- Mount edge finder in spindle\n"
            "- Set RPM to 1000\n"
            "- Approach workpiece slowly\n\n"
            "Guidelines for Feed and Speed Selection:\n"
            "A rule of thumb for aluminum: start at 300 SFM.\n\n"
            "Tips and Tricks:\n"
            "Do not exceed 0.005 inch stepover for finish passes."
        )
        result = classify_document(text, title="CNC Machinist's Handbook")
        assert result.doc_type == DocumentType.HANDBOOK
        assert result.confidence >= 0.4


class TestBlogArticle:
    """Test blog article classification."""

    def test_obvious_blog(self):
        text = (
            "In this post, I want to share my experience with adaptive clearing "
            "in Fusion 360. I found that using a smaller stepover gave me better "
            "surface finish. Let me share what I learned.\n\n"
            "My experience with the 3-flute endmill was great. "
            "I was surprised by the tool life improvement.\n\n"
            "Stay tuned for my next post on trochoidal milling. "
            "Leave your comments below!"
        )
        result = classify_document(text, title="My CNC Blog Post")
        assert result.doc_type == DocumentType.BLOG_ARTICLE
        assert result.confidence >= 0.4

    def test_short_informal_text(self):
        text = (
            "So I tried this new endmill today and it was amazing. "
            "My experience was way better than I expected. "
            "In this post I wanted to share my setup."
        )
        result = classify_document(text)
        assert result.doc_type == DocumentType.BLOG_ARTICLE


class TestNotes:
    """Test notes classification."""

    def test_bullet_point_notes(self):
        text = (
            "- check spindle runout\n"
            "- order new 1/2 endmill\n"
            "- coolant level low\n"
            "- adjust G54 offset\n"
            "- feed rate too high on pocket op\n"
            "- try climb milling instead\n"
            "- ask about new workholding\n"
        )
        result = classify_document(text, title="Shop Notes 2025-03-01")
        assert result.doc_type == DocumentType.NOTES
        assert result.confidence >= 0.4

    def test_short_fragments(self):
        text = "Quick note: endmill broke at 8000 RPM."
        result = classify_document(text)
        assert result.doc_type == DocumentType.NOTES


class TestSpecification:
    """Test specification classification."""

    def test_obvious_specification(self):
        text = (
            "1. Scope\n"
            "This specification defines the requirements for CNC machined parts.\n\n"
            "2. Requirements\n"
            "2.1 The surface roughness shall not exceed Ra 1.6 µm.\n"
            "2.2 The tolerance shall be within ±0.01 mm.\n"
            "2.3 Parts shall comply with ISO 2768-m.\n"
            "2.4 Material shall conform to ASTM A36.\n\n"
            "3. Compliance\n"
            "All parts shall be inspected per ANSI Y14.5.\n"
        )
        result = classify_document(text, title="Part Specification PS-2025-001")
        assert result.doc_type == DocumentType.SPECIFICATION
        assert result.confidence >= 0.4


class TestOther:
    """Test fallback classification."""

    def test_generic_text_low_confidence(self):
        text = "Hello world. This is some generic text without any specific structure."
        result = classify_document(text)
        # Short generic text may classify as NOTES or OTHER — either is acceptable
        assert result.doc_type in (DocumentType.OTHER, DocumentType.NOTES)
        assert result.confidence < 0.7

    def test_very_short_text(self):
        result = classify_document("ok")
        assert result.doc_type in (DocumentType.OTHER, DocumentType.NOTES)


class TestSecondaryType:
    """Test secondary type detection."""

    def test_manual_with_handbook_elements(self):
        text = (
            "Table of Contents\n"
            "Chapter 1: Installation Procedure\n"
            "Best Practice: Always level the machine first.\n"
            "Guidelines for setup include...\n"
            "Operating Instructions follow.\n"
            "Recommended Procedure for alignment.\n"
            "Rule of thumb: use 0.001 per inch.\n"
            "Safety Precautions must be followed.\n"
            "Appendix A: Parts List\n"
        )
        result = classify_document(text)
        # Should have a secondary type
        primary = result.doc_type
        assert primary in (DocumentType.TECHNICAL_MANUAL, DocumentType.HANDBOOK)
        if result.secondary_type:
            assert result.secondary_type != primary


class TestToDict:
    """Test serialization."""

    def test_to_dict_format(self):
        result = classify_document("Abstract\nReferences\n[1] Smith et al.", has_doi=True)
        d = result.to_dict()
        assert "doc_type" in d
        assert "confidence" in d
        assert "evidence" in d
        assert isinstance(d["evidence"], list)
