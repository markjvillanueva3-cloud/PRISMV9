"""Tests for PDF Ingestion Pipeline — CC-EXT-MS1-P0-U01.

Tests text extraction, page segmentation, metadata extraction,
document type classification, and edge cases. Uses synthetic
PDF-like content since actual PDF libraries may not be installed.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.extraction.pdf_ingestion import (
    RegionType,
    DocumentType,
    PageRegion,
    PageContent,
    DocumentMetadata,
    IngestedDocument,
    PDFIngestionPipeline,
    classify_document_type,
    segment_page,
)


# ---------------------------------------------------------------------------
# Document Type Classification
# ---------------------------------------------------------------------------

class TestDocumentTypeClassification:
    """classify_document_type() detects document categories."""

    def test_catalog_detection(self):
        text = "Sandvik Coromant Catalog 2024. Ordering information. Part number CNMG120408. Product range for turning."
        assert classify_document_type(text) == DocumentType.CATALOG

    def test_manual_detection(self):
        text = "Operator Manual for CNC Milling Machine. Chapter 1: Safety. Table of Contents. Appendix A: Maintenance Schedule."
        assert classify_document_type(text) == DocumentType.MANUAL

    def test_datasheet_detection(self):
        text = "Technical Data Sheet. Specifications for Grade GC4325. Typical values under test conditions."
        assert classify_document_type(text) == DocumentType.DATASHEET

    def test_technical_note_detection(self):
        text = "Application Note: Best Practices for Titanium Machining. Recommendations for coolant and speed."
        assert classify_document_type(text) == DocumentType.TECHNICAL_NOTE

    def test_academic_paper_detection(self):
        text = "Abstract: This paper presents a methodology for optimizing cutting parameters. Introduction. Results. Conclusion. References. DOI: 10.1234."
        assert classify_document_type(text) == DocumentType.ACADEMIC_PAPER

    def test_unknown_type_for_generic_text(self):
        text = "Hello world. This is some generic text with no specific signals."
        assert classify_document_type(text) == DocumentType.UNKNOWN

    def test_title_contributes_to_classification(self):
        result = classify_document_type("Some generic text", title="Product Catalog 2024")
        assert result == DocumentType.CATALOG


# ---------------------------------------------------------------------------
# Page Segmentation
# ---------------------------------------------------------------------------

class TestPageSegmentation:
    """segment_page() classifies text blocks into regions."""

    def test_plain_text_region(self):
        # Multiple blocks separated by blank lines — middle/later blocks get TEXT classification
        text = "Header area content.\n\nThis is a paragraph about milling operations and CNC machining.\nIt discusses various aspects of tooling and setup procedures.\n\nAnother paragraph with more technical details about feeds and speeds."
        regions = segment_page(text, page_number=1)
        assert len(regions) >= 2
        text_regions = [r for r in regions if r.region_type == RegionType.TEXT]
        assert len(text_regions) >= 1

    def test_table_detection(self):
        # Table reference in first block, tabular data in second block
        text = "Introduction to parameters.\n\nTable 1: Cutting Parameters\nMaterial\tSpeed\tFeed\naluminum\t300\t0.10\nsteel\t150\t0.08"
        regions = segment_page(text, page_number=1)
        table_regions = [r for r in regions if r.region_type == RegionType.TABLE]
        assert len(table_regions) >= 1

    def test_figure_detection(self):
        text = "Introductory text about cutting tools and their properties.\n\nFigure 3: Tool geometry for roughing operations\n\nMore text after the figure reference."
        regions = segment_page(text, page_number=1)
        figure_regions = [r for r in regions if r.region_type == RegionType.FIGURE]
        assert len(figure_regions) >= 1

    def test_header_detection_by_content(self):
        text = "Page 42\n\nMain body text about machining operations and cutting parameters."
        regions = segment_page(text, page_number=42, page_height=792.0)
        header_regions = [r for r in regions if r.region_type == RegionType.HEADER]
        assert len(header_regions) >= 1

    def test_footer_detection_by_content(self):
        text = "Main body text about machining operations and tool selection.\n\nSecond paragraph with more details about the process.\n\n© 2024 All Rights Reserved"
        regions = segment_page(text, page_number=1)
        footer_regions = [r for r in regions if r.region_type == RegionType.FOOTER]
        assert len(footer_regions) >= 1

    def test_empty_page_returns_no_regions(self):
        regions = segment_page("", page_number=1)
        assert regions == []

    def test_whitespace_only_returns_no_regions(self):
        regions = segment_page("   \n  \n  ", page_number=1)
        assert regions == []

    def test_multiple_region_types(self):
        text = (
            "Page 5\n\n"
            "This is body text about machining.\n\n"
            "Table 2: Speed/Feed Data\n"
            "Mat\tSpeed\tFeed\n"
            "Al\t300\t0.1\n\n"
            "Figure 1: Tool geometry\n\n"
            "© 2024 Company"
        )
        regions = segment_page(text, page_number=5)
        types = {r.region_type for r in regions}
        assert RegionType.TEXT in types or RegionType.TABLE in types
        assert len(regions) >= 3

    def test_page_number_preserved(self):
        regions = segment_page("Some text content here.", page_number=42)
        assert all(r.page_number == 42 for r in regions)


# ---------------------------------------------------------------------------
# Data Classes
# ---------------------------------------------------------------------------

class TestPageRegion:
    """PageRegion data class behavior."""

    def test_to_dict(self):
        region = PageRegion(
            region_type=RegionType.TABLE,
            text="Speed\tFeed\n300\t0.10",
            page_number=3,
            bbox=(10, 20, 500, 200),
            confidence=0.85,
        )
        d = region.to_dict()
        assert d["region_type"] == "table"
        assert d["page_number"] == 3
        assert d["confidence"] == 0.85
        assert d["bbox"] == [10, 20, 500, 200]

    def test_long_text_truncated_in_dict(self):
        long_text = "x" * 300
        region = PageRegion(RegionType.TEXT, long_text, 1)
        d = region.to_dict()
        assert len(d["text"]) < 210  # 200 + "..."


class TestPageContent:
    """PageContent data class behavior."""

    def test_to_dict(self):
        page = PageContent(
            page_number=1,
            full_text="Hello world",
            word_count=2,
            has_tables=True,
        )
        d = page.to_dict()
        assert d["page_number"] == 1
        assert d["word_count"] == 2
        assert d["has_tables"] is True


class TestDocumentMetadata:
    """DocumentMetadata data class behavior."""

    def test_to_dict(self):
        meta = DocumentMetadata(
            title="CNC Manual",
            author="PRISM",
            page_count=50,
            document_type=DocumentType.MANUAL,
        )
        d = meta.to_dict()
        assert d["title"] == "CNC Manual"
        assert d["document_type"] == "manual"
        assert d["page_count"] == 50


class TestIngestedDocument:
    """IngestedDocument data class behavior."""

    def test_page_count_property(self):
        doc = IngestedDocument(
            source_path="/test.pdf",
            metadata=DocumentMetadata(),
            pages=[
                PageContent(1, "Page 1 text", word_count=3),
                PageContent(2, "Page 2 text", word_count=3),
            ],
        )
        assert doc.page_count == 2

    def test_get_full_text(self):
        doc = IngestedDocument(
            source_path="/test.pdf",
            metadata=DocumentMetadata(),
            pages=[
                PageContent(1, "First page", word_count=2),
                PageContent(2, "Second page", word_count=2),
            ],
        )
        full = doc.get_full_text()
        assert "First page" in full
        assert "Second page" in full

    def test_get_regions_by_type(self):
        doc = IngestedDocument(
            source_path="/test.pdf",
            metadata=DocumentMetadata(),
            pages=[
                PageContent(1, "text", regions=[
                    PageRegion(RegionType.TEXT, "body", 1),
                    PageRegion(RegionType.TABLE, "data", 1),
                ]),
                PageContent(2, "text", regions=[
                    PageRegion(RegionType.TABLE, "more data", 2),
                ]),
            ],
        )
        tables = doc.get_regions_by_type(RegionType.TABLE)
        assert len(tables) == 2

    def test_to_dict(self):
        doc = IngestedDocument(
            source_path="/test.pdf",
            metadata=DocumentMetadata(title="Test"),
            total_words=100,
            success=True,
        )
        d = doc.to_dict()
        assert d["source_path"] == "/test.pdf"
        assert d["total_words"] == 100
        assert d["success"] is True
        assert d["metadata"]["title"] == "Test"


# ---------------------------------------------------------------------------
# Pipeline: File Handling
# ---------------------------------------------------------------------------

class TestPDFIngestionPipeline:
    """PDFIngestionPipeline handles file loading and error cases."""

    def test_nonexistent_file_returns_error(self):
        pipeline = PDFIngestionPipeline()
        result = pipeline.ingest("/nonexistent/path/file.pdf")
        assert result.success is False
        assert "not found" in result.error.lower()

    def test_non_pdf_file_returns_error(self, tmp_path):
        txt_file = tmp_path / "test.txt"
        txt_file.write_text("not a pdf")
        pipeline = PDFIngestionPipeline()
        result = pipeline.ingest(str(txt_file))
        assert result.success is False
        assert "not a pdf" in result.error.lower()

    def test_url_source_detected(self):
        pipeline = PDFIngestionPipeline()
        # Will fail to download but should attempt URL path
        result = pipeline.ingest("https://example.com/nonexistent.pdf")
        assert result.success is False
        # Should have attempted URL download, not file path
        assert "not found" not in result.error.lower() or "download" in result.error.lower() or "Failed" in result.error

    def test_max_pages_enforced(self):
        pipeline = PDFIngestionPipeline(max_pages=10)
        assert pipeline._max_pages == 10

    def test_ocr_toggle(self):
        pipeline = PDFIngestionPipeline(ocr_enabled=False)
        assert pipeline._ocr_enabled is False


# ---------------------------------------------------------------------------
# Pipeline: Real PDF (if PyMuPDF available)
# ---------------------------------------------------------------------------

class TestPDFIngestionWithPyMuPDF:
    """Tests that require PyMuPDF to create and process real PDFs."""

    @pytest.fixture
    def fitz(self):
        try:
            import fitz
            return fitz
        except ImportError:
            pytest.skip("PyMuPDF not installed")

    def _create_test_pdf(self, fitz, tmp_path, pages_content: list[str],
                         title: str = "Test Document") -> str:
        """Create a real PDF with given page content."""
        doc = fitz.open()
        for text in pages_content:
            page = doc.new_page()
            page.insert_text((72, 72), text, fontsize=12)
        doc.set_metadata({"title": title, "author": "PRISM Test"})
        pdf_path = str(tmp_path / "test.pdf")
        doc.save(pdf_path)
        doc.close()
        return pdf_path

    def test_single_page_extraction(self, fitz, tmp_path):
        """Extract text from a single-page PDF."""
        pdf_path = self._create_test_pdf(
            fitz, tmp_path,
            ["Cutting speed for aluminum: 300 m/min. Feed per tooth: 0.10 mm/tooth."],
            title="Machining Parameters",
        )
        pipeline = PDFIngestionPipeline()
        result = pipeline.ingest(pdf_path)
        assert result.success is True
        assert result.page_count == 1
        assert result.total_words > 0
        assert "aluminum" in result.get_full_text().lower()

    def test_multi_page_extraction(self, fitz, tmp_path):
        """Extract text from a multi-page PDF."""
        pdf_path = self._create_test_pdf(fitz, tmp_path, [
            "Chapter 1: Introduction to CNC Milling",
            "Chapter 2: Cutting Parameters and Tool Selection",
            "Chapter 3: Safety and Best Practices",
        ])
        pipeline = PDFIngestionPipeline()
        result = pipeline.ingest(pdf_path)
        assert result.success is True
        assert result.page_count == 3
        assert "Chapter 1" in result.pages[0].full_text

    def test_metadata_extraction(self, fitz, tmp_path):
        """Metadata (title, author) extracted from PDF."""
        pdf_path = self._create_test_pdf(
            fitz, tmp_path,
            ["Some content"],
            title="Sandvik Coromant Catalog 2024",
        )
        pipeline = PDFIngestionPipeline()
        result = pipeline.ingest(pdf_path)
        assert result.success is True
        assert "Sandvik" in result.metadata.title
        assert result.metadata.author == "PRISM Test"

    def test_document_type_classified(self, fitz, tmp_path):
        """Document type classified from content."""
        pdf_path = self._create_test_pdf(fitz, tmp_path, [
            "Operator Manual for CNC Machine. Chapter 1: Safety. Table of Contents.",
        ])
        pipeline = PDFIngestionPipeline()
        result = pipeline.ingest(pdf_path)
        assert result.success is True
        assert result.metadata.document_type == DocumentType.MANUAL

    def test_page_segmentation_applied(self, fitz, tmp_path):
        """Pages get segmented into regions."""
        pdf_path = self._create_test_pdf(fitz, tmp_path, [
            "Introduction text.\n\nTable 1: Speed Data\nMat\tSpeed\nAl\t300\n\nMore text.",
        ])
        pipeline = PDFIngestionPipeline()
        result = pipeline.ingest(pdf_path)
        assert result.success is True
        assert len(result.pages[0].regions) > 0

    def test_large_pdf_handling(self, fitz, tmp_path):
        """Handles a 100-page PDF without error."""
        pages = [f"Page {i+1}: Content about machining topic {i+1}." for i in range(100)]
        pdf_path = self._create_test_pdf(fitz, tmp_path, pages)
        pipeline = PDFIngestionPipeline()
        result = pipeline.ingest(pdf_path)
        assert result.success is True
        assert result.page_count == 100

    def test_max_pages_enforced_real(self, fitz, tmp_path):
        """Pipeline rejects PDF exceeding max_pages."""
        pages = [f"Page {i}" for i in range(20)]
        pdf_path = self._create_test_pdf(fitz, tmp_path, pages)
        pipeline = PDFIngestionPipeline(max_pages=10)
        result = pipeline.ingest(pdf_path)
        assert result.success is False
        assert "exceeds max" in result.error

    def test_serialization_roundtrip(self, fitz, tmp_path):
        """IngestedDocument serializes to dict cleanly."""
        pdf_path = self._create_test_pdf(fitz, tmp_path, ["Test content for serialization."])
        pipeline = PDFIngestionPipeline()
        result = pipeline.ingest(pdf_path)
        d = result.to_dict()
        assert isinstance(d, dict)
        assert d["success"] is True
        assert isinstance(d["metadata"], dict)

    def test_empty_pdf(self, fitz, tmp_path):
        """Empty PDF (no text) handled gracefully."""
        doc = fitz.open()
        doc.new_page()
        pdf_path = str(tmp_path / "empty.pdf")
        doc.save(pdf_path)
        doc.close()

        pipeline = PDFIngestionPipeline(ocr_enabled=False)
        result = pipeline.ingest(pdf_path)
        # Should succeed but with 0 words
        assert result.total_words == 0


# ---------------------------------------------------------------------------
# Edge cases and enum completeness
# ---------------------------------------------------------------------------

class TestEnumCompleteness:
    """Verify enums have expected members."""

    def test_region_type_members(self):
        expected = {"text", "table", "figure", "header", "footer"}
        actual = {rt.value for rt in RegionType}
        assert expected == actual

    def test_document_type_members(self):
        expected = {"manual", "catalog", "datasheet", "technical_note",
                    "academic_paper", "unknown"}
        actual = {dt.value for dt in DocumentType}
        assert expected == actual
