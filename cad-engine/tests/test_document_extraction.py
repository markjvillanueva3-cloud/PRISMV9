"""Tests for Document Extraction Pipeline (CC-EXT-MS0 U03-U05).

Tests cover:
- Document-specific prompt builders
- Document chunking
- Chunk merging and deduplication
- Full extraction orchestrator (mocked API)
- Schema extension verification
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest


# ---------------------------------------------------------------------------
# Prompt builder tests
# ---------------------------------------------------------------------------


class TestDocumentPrompts:
    """Test document-specific prompt building."""

    def test_get_cad_document_prompt(self):
        from src.prompts.document_prompts import get_document_prompt
        prompt = get_document_prompt("cad", "academic_paper")
        assert "TEXT DOCUMENT" in prompt
        assert "page_number" in prompt
        assert "academic" in prompt.lower() or "ACADEMIC" in prompt

    def test_get_cam_document_prompt(self):
        from src.prompts.document_prompts import get_document_prompt
        prompt = get_document_prompt("cam", "technical_manual")
        assert "TEXT DOCUMENT" in prompt
        assert "cutting_parameters" in prompt or "cutting parameters" in prompt.lower()

    def test_get_shop_document_prompt(self):
        from src.prompts.document_prompts import get_document_prompt
        prompt = get_document_prompt("shop", "handbook")
        assert "TEXT DOCUMENT" in prompt
        assert "practices" in prompt.lower()
        assert "best practice" in prompt.lower() or "handbook" in prompt.lower()

    def test_generic_doc_type_fallback(self):
        from src.prompts.document_prompts import get_document_prompt
        prompt = get_document_prompt("shop", None)
        assert "general manufacturing" in prompt.lower()

    def test_build_user_message_includes_text(self):
        from src.prompts.document_prompts import build_document_user_message
        msg = build_document_user_message("Cutting speed for aluminum is 300 m/min")
        assert "DOCUMENT TEXT" in msg
        assert "Cutting speed" in msg

    def test_build_user_message_includes_metadata(self):
        from src.prompts.document_prompts import build_document_user_message
        msg = build_document_user_message(
            "content",
            title="CNC Handbook",
            author="J. Smith",
            doc_type="handbook",
        )
        assert "DOCUMENT METADATA" in msg
        assert "CNC Handbook" in msg
        assert "J. Smith" in msg
        assert "handbook" in msg

    def test_build_user_message_truncates_long_text(self):
        from src.prompts.document_prompts import build_document_user_message
        long_text = "x" * 20000
        msg = build_document_user_message(long_text)
        assert "truncated" in msg
        assert len(msg) < 20000

    def test_build_user_message_chunk_info(self):
        from src.prompts.document_prompts import build_document_user_message
        msg = build_document_user_message("content", page_number=5, total_pages=20)
        assert "5" in msg
        assert "20" in msg


# ---------------------------------------------------------------------------
# Schema extension tests
# ---------------------------------------------------------------------------


class TestSchemaExtension:
    """Verify schema v2 was extended for documents."""

    SCHEMA_PATH = Path(__file__).parent.parent / "schemas" / "knowledge_schema_v2.json"

    def test_provenance_has_document_source_type(self):
        with open(self.SCHEMA_PATH) as f:
            schema = json.load(f)
        source_types = schema["definitions"]["provenance"]["properties"]["source_type"]["enum"]
        assert "document" in source_types

    def test_provenance_has_page_number(self):
        with open(self.SCHEMA_PATH) as f:
            schema = json.load(f)
        props = schema["definitions"]["provenance"]["properties"]
        assert "page_number" in props

    def test_provenance_has_section_title(self):
        with open(self.SCHEMA_PATH) as f:
            schema = json.load(f)
        props = schema["definitions"]["provenance"]["properties"]
        assert "section_title" in props

    def test_metadata_has_source_type(self):
        with open(self.SCHEMA_PATH) as f:
            schema = json.load(f)
        meta_props = schema["properties"]["metadata"]["properties"]
        assert "source_type" in meta_props
        assert "document" in meta_props["source_type"]["enum"]

    def test_metadata_has_document_metadata(self):
        with open(self.SCHEMA_PATH) as f:
            schema = json.load(f)
        meta_props = schema["properties"]["metadata"]["properties"]
        assert "document_metadata" in meta_props
        doc_meta = meta_props["document_metadata"]["properties"]
        assert "author" in doc_meta
        assert "doi" in doc_meta
        assert "doc_type" in doc_meta
        assert "page_count" in doc_meta

    def test_existing_video_schema_still_works(self):
        """Backward compatibility: existing provenance fields still present."""
        with open(self.SCHEMA_PATH) as f:
            schema = json.load(f)
        prov = schema["definitions"]["provenance"]["properties"]
        assert "timestamp_seconds" in prov
        assert "frame_path" in prov
        assert "transcript_span" in prov


# ---------------------------------------------------------------------------
# Chunking tests
# ---------------------------------------------------------------------------


class TestDocumentChunking:
    """Test document chunking for large documents."""

    def test_small_document_single_chunk(self):
        from src.document_extract import _chunk_document
        from src.document_ingest import DocumentIngestResult, DocumentPage

        result = DocumentIngestResult(
            text="Page 1 text. Page 2 text.",
            pages=[
                DocumentPage(page_number=1, text="Page 1 text."),
                DocumentPage(page_number=2, text="Page 2 text."),
            ],
        )
        chunks = _chunk_document(result)
        assert len(chunks) == 1
        assert chunks[0].start_page == 1
        assert chunks[0].end_page == 2

    def test_large_document_multiple_chunks(self):
        from src.document_extract import _chunk_document, _MAX_PAGES_PER_CHUNK
        from src.document_ingest import DocumentIngestResult, DocumentPage

        # Create 30-page document
        pages = [DocumentPage(page_number=i + 1, text=f"Page {i + 1} content.") for i in range(30)]
        result = DocumentIngestResult(
            text="\n\n".join(p.text for p in pages),
            pages=pages,
        )

        chunks = _chunk_document(result)
        assert len(chunks) >= 2
        # First chunk starts at page 1
        assert chunks[0].start_page == 1
        # Last chunk ends at page 30
        assert chunks[-1].end_page == 30

    def test_empty_document_single_chunk(self):
        from src.document_extract import _chunk_document
        from src.document_ingest import DocumentIngestResult

        result = DocumentIngestResult(text="Some text", pages=[])
        chunks = _chunk_document(result)
        assert len(chunks) == 1


# ---------------------------------------------------------------------------
# Merge/dedup tests
# ---------------------------------------------------------------------------


class TestMergeResults:
    """Test chunk result merging and deduplication."""

    def test_dedup_by_id_cad(self):
        from src.document_extract import _merge_domain_results
        results = [
            {"features": [
                {"id": "cad-001", "name": "Sketch"},
                {"id": "cad-002", "name": "Extrude"},
            ]},
            {"features": [
                {"id": "cad-002", "name": "Extrude (dup)"},
                {"id": "cad-003", "name": "Fillet"},
            ]},
        ]
        merged = _merge_domain_results("cad", results)
        ids = [f["id"] for f in merged["features"]]
        assert ids == ["cad-001", "cad-002", "cad-003"]
        # First occurrence kept
        assert merged["features"][1]["name"] == "Extrude"

    def test_dedup_by_id_cam(self):
        from src.document_extract import _merge_domain_results
        results = [
            {"strategies": [{"id": "cam-001", "name": "Rough"}], "tool_list": [{"number": 1, "type": "end_mill"}]},
            {"strategies": [{"id": "cam-001", "name": "Rough dup"}], "tool_list": [{"number": 1, "type": "dup"}, {"number": 2, "type": "drill"}]},
        ]
        merged = _merge_domain_results("cam", results)
        assert len(merged["strategies"]) == 1
        assert len(merged["tool_list"]) == 2  # tool 1 and tool 2

    def test_dedup_by_id_shop(self):
        from src.document_extract import _merge_domain_results
        results = [
            {"practices": [{"id": "shop-001", "title": "Setup"}], "key_takeaways": ["Always indicate"]},
            {"practices": [{"id": "shop-002", "title": "Cutting"}], "key_takeaways": ["Always indicate", "Check coolant"]},
        ]
        merged = _merge_domain_results("shop", results)
        assert len(merged["practices"]) == 2
        assert len(merged["key_takeaways"]) == 2  # deduped

    def test_empty_results(self):
        from src.document_extract import _merge_domain_results
        assert _merge_domain_results("cad", []) == {}


# ---------------------------------------------------------------------------
# Orchestrator integration tests (mocked API)
# ---------------------------------------------------------------------------


_MOCK_DOC_CAD = json.dumps({
    "features": [
        {
            "id": "cad-001",
            "name": "Base Plate",
            "feature_type": "extrude",
            "parameters": [{"name": "height", "value": 10, "unit": "mm"}],
            "parent_feature_id": None,
            "design_intent": "Create base body",
            "constraints": [],
            "provenance": {"source_type": "document", "confidence": 0.85, "page_number": 3, "section_title": "Design"},
            "cross_links": [],
        },
    ],
    "design_intent_summary": "Flat plate design from academic paper",
    "modeling_approach": "Parametric",
})

_MOCK_DOC_CAM = json.dumps({
    "strategies": [
        {
            "id": "cam-001",
            "name": "Face Milling",
            "operation_type": "face_mill",
            "sequence_order": 1,
            "tool": {"type": "face_mill", "diameter_mm": 50, "flutes": 5},
            "cutting_parameters": [{"name": "spindle_rpm", "value": 3000, "unit": "rpm"}],
            "target_features": ["cad-001"],
            "provenance": {"source_type": "document", "confidence": 0.8, "page_number": 5, "section_title": "Machining"},
            "cross_links": [],
        },
    ],
    "machining_summary": "Face milling strategy from paper",
    "tool_list": [],
})

_MOCK_DOC_SHOP = json.dumps({
    "practices": [
        {
            "id": "shop-001",
            "title": "Workholding Setup",
            "practice_type": "setup_procedure",
            "description": "Vise alignment technique from handbook",
            "steps": ["Mount indicator", "Sweep jaw", "Adjust"],
            "warnings": ["Check indicator calibration"],
            "provenance": {"source_type": "document", "confidence": 0.9, "page_number": 12, "section_title": "Setup"},
            "cross_links": [],
        },
    ],
    "setup_summary": "Standard vise setup from handbook",
    "key_takeaways": ["Always indicate before precision work"],
})


class TestDocumentExtractOrchestrator:
    """Test full document extraction pipeline with mocked API."""

    @patch("src.document_extract._call_extraction")
    def test_markdown_extraction(self, mock_call, tmp_path):
        """Test extraction from a markdown document."""
        mock_call.return_value = json.loads(_MOCK_DOC_SHOP)

        md_file = tmp_path / "notes.md"
        md_file.write_text(
            "---\ntitle: Shop Notes\nauthor: Machinist Bob\n---\n\n"
            "# Setup\n\nAlways indicate your vise. Use a dial indicator.\n\n"
            "# Cutting\n\nFor aluminum, start at 300 SFM."
        )

        from src.document_extract import extract_from_document
        result = extract_from_document(md_file, force_domain="shop")

        assert result.video_id == "notes"
        assert result.knowledge["schema_version"] == "2.0.0"
        assert result.knowledge["metadata"]["source_type"] == "document"
        assert result.knowledge["metadata"]["document_metadata"]["format"] == "markdown"
        assert result.knowledge["metadata"]["document_metadata"]["author"] == "Machinist Bob"
        assert "shop" in result.knowledge["domains"]

    @patch("src.document_extract._call_extraction")
    def test_multi_domain_document(self, mock_call, tmp_path):
        """Test multi-domain extraction from a document."""
        mock_call.side_effect = [
            json.loads(_MOCK_DOC_CAD),
            json.loads(_MOCK_DOC_CAM),
            json.loads(_MOCK_DOC_SHOP),
        ]

        md_file = tmp_path / "paper.md"
        md_file.write_text(
            "# Abstract\n\nThis paper studies CNC machining of aluminum brackets.\n\n"
            "# CAD Design\n\nThe bracket was designed with a 10mm base plate.\n\n"
            "# CAM Strategy\n\nFace milling at 3000 RPM.\n\n"
            "# Shop Practice\n\nAlways indicate your vise."
        )

        from src.document_extract import extract_from_document
        result = extract_from_document(md_file, force_domain="multi")

        domains = result.knowledge["domains"]
        assert "cad" in domains
        assert "cam" in domains
        assert "shop" in domains

        # Cross-domain links should exist (CAM targets CAD feature)
        links = result.knowledge["cross_domain_links"]
        assert len(links) >= 1

    @patch("src.document_extract._call_extraction")
    def test_extraction_with_custom_id(self, mock_call, tmp_path):
        """Test custom document ID."""
        mock_call.return_value = json.loads(_MOCK_DOC_CAD)

        txt_file = tmp_path / "data.txt"
        txt_file.write_text("Extrude 10mm base plate for bracket")

        from src.document_extract import extract_from_document
        result = extract_from_document(txt_file, document_id="DOC-2025-001", force_domain="cad")

        assert result.video_id == "DOC-2025-001"

    @patch("src.document_extract._call_extraction")
    def test_extraction_includes_validation(self, mock_call, tmp_path):
        """Test that validation results are included."""
        mock_call.return_value = json.loads(_MOCK_DOC_CAD)

        txt_file = tmp_path / "design.txt"
        txt_file.write_text("A bracket with extrude feature")

        from src.document_extract import extract_from_document
        result = extract_from_document(txt_file, force_domain="cad")

        assert "cad" in result.validation_results
        assert result.validation_results["cad"]["is_valid"] is True

    @patch("src.document_extract._call_extraction")
    def test_extraction_stats(self, mock_call, tmp_path):
        """Test extraction statistics are computed."""
        mock_call.return_value = json.loads(_MOCK_DOC_CAD)

        txt_file = tmp_path / "cad.txt"
        txt_file.write_text("Design a plate")

        from src.document_extract import extract_from_document
        result = extract_from_document(txt_file, force_domain="cad")

        stats = result.knowledge["extraction_stats"]
        assert stats["total_items"] == 1
        assert stats["cad_features"] == 1

    def test_missing_file_returns_error(self):
        from src.document_extract import extract_from_document
        result = extract_from_document("/nonexistent/file.pdf")
        assert not result.is_valid
        assert len(result.errors) >= 1

    @patch("src.document_extract._call_extraction")
    def test_api_error_recorded(self, mock_call, tmp_path):
        """API failures are recorded as errors, not raised."""
        from src.document_extract import extract_from_document
        from src.knowledge_extract import ExtractionError
        mock_call.side_effect = ExtractionError("API error")

        txt_file = tmp_path / "test.txt"
        txt_file.write_text("Some manufacturing content here")

        result = extract_from_document(txt_file, force_domain="cad")
        assert not result.is_valid
        assert any("API error" in e for e in result.errors)

    def test_invalid_force_domain_raises(self, tmp_path):
        from src.document_extract import extract_from_document
        from src.knowledge_extract import ExtractionError

        txt_file = tmp_path / "test.txt"
        txt_file.write_text("test content")

        with pytest.raises(ExtractionError, match="Invalid force_domain"):
            extract_from_document(txt_file, force_domain="invalid")
