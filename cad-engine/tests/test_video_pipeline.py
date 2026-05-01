"""Tests for CC-MS1: Video Ingestion Pipeline + Vision Analysis.

Tests all 6 pipeline modules without requiring network access, API keys,
or external tools. Uses synthetic data and mocks where needed.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Ensure src is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

# ---------------------------------------------------------------------------
# video_ingest tests
# ---------------------------------------------------------------------------

from video_ingest import (
    TranscriptSegment,
    VideoMetadata,
    IngestResult,
    _parse_vtt,
    _parse_srt,
    _deduplicate_segments,
)


class TestVTTParsing:
    """Test WebVTT subtitle parsing."""

    def test_basic_vtt(self):
        vtt = (
            "WEBVTT\n\n"
            "00:00:01.000 --> 00:00:04.000\n"
            "Hello world\n\n"
            "00:00:05.000 --> 00:00:08.500\n"
            "Second line\n"
        )
        segs = _parse_vtt(vtt)
        assert len(segs) == 2
        assert segs[0].start_seconds == 1.0
        assert segs[0].end_seconds == 4.0
        assert segs[0].text == "Hello world"
        assert segs[1].start_seconds == 5.0
        assert segs[1].end_seconds == 8.5
        assert segs[1].text == "Second line"

    def test_vtt_with_hours(self):
        vtt = "WEBVTT\n\n1:02:03.456 --> 1:05:10.789\nLong video\n"
        segs = _parse_vtt(vtt)
        assert len(segs) == 1
        assert segs[0].start_seconds == pytest.approx(3723.456, abs=0.001)
        assert segs[0].end_seconds == pytest.approx(3910.789, abs=0.001)

    def test_vtt_with_html_tags(self):
        vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:03.000\n<b>Bold</b> text <i>here</i>\n"
        segs = _parse_vtt(vtt)
        assert segs[0].text == "Bold text here"

    def test_vtt_with_position_tags(self):
        vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:03.000\n<00:00:01.000>Word <00:00:02.000>by word\n"
        segs = _parse_vtt(vtt)
        assert segs[0].text == "Word by word"

    def test_vtt_multiline(self):
        vtt = (
            "WEBVTT\n\n"
            "00:00:01.000 --> 00:00:05.000\n"
            "First line\n"
            "Second line\n"
        )
        segs = _parse_vtt(vtt)
        assert segs[0].text == "First line Second line"

    def test_empty_vtt(self):
        segs = _parse_vtt("WEBVTT\n\n")
        assert len(segs) == 0


class TestSRTParsing:
    """Test SRT subtitle parsing."""

    def test_basic_srt(self):
        srt = (
            "1\n"
            "00:00:01,000 --> 00:00:04,000\n"
            "Hello from SRT\n\n"
            "2\n"
            "00:00:05,000 --> 00:00:08,500\n"
            "Second subtitle\n"
        )
        segs = _parse_srt(srt)
        assert len(segs) == 2
        assert segs[0].text == "Hello from SRT"
        assert segs[1].start_seconds == 5.0

    def test_srt_with_html(self):
        srt = "1\n00:00:01,000 --> 00:00:03,000\n<font color='white'>Styled</font>\n"
        segs = _parse_srt(srt)
        assert segs[0].text == "Styled"

    def test_empty_srt(self):
        segs = _parse_srt("")
        assert len(segs) == 0


class TestDeduplication:
    """Test segment deduplication."""

    def test_removes_consecutive_duplicates(self):
        segs = [
            TranscriptSegment(0, 2, "same"),
            TranscriptSegment(2, 4, "same"),
            TranscriptSegment(4, 6, "different"),
            TranscriptSegment(6, 8, "different"),
        ]
        result = _deduplicate_segments(segs)
        assert len(result) == 2
        assert result[0].text == "same"
        assert result[1].text == "different"

    def test_empty_list(self):
        assert _deduplicate_segments([]) == []

    def test_no_duplicates(self):
        segs = [
            TranscriptSegment(0, 2, "a"),
            TranscriptSegment(2, 4, "b"),
        ]
        result = _deduplicate_segments(segs)
        assert len(result) == 2


class TestDataclassSerialization:
    """Test to_dict serialization for all dataclasses."""

    def test_transcript_segment(self):
        seg = TranscriptSegment(1.0, 3.5, "test text")
        d = seg.to_dict()
        assert d == {"start": 1.0, "end": 3.5, "text": "test text"}

    def test_video_metadata(self):
        meta = VideoMetadata(
            video_id="abc123", title="Test", description="Desc",
            duration_seconds=120.0, uploader="User", upload_date="20260101",
            url="https://example.com", view_count=1000, tags=["cnc"],
        )
        d = meta.to_dict()
        assert d["video_id"] == "abc123"
        assert d["duration_seconds"] == 120.0
        assert d["tags"] == ["cnc"]

    def test_ingest_result(self):
        meta = VideoMetadata("id", "T", "D", 60, "U", "20260101", "url")
        segs = [TranscriptSegment(0, 5, "hello")]
        result = IngestResult(meta, segs, "hello", "/video.mp4", "/subs.vtt")
        d = result.to_dict()
        assert d["transcript_text"] == "hello"
        assert d["video_path"] == "/video.mp4"
        assert len(d["transcript"]) == 1


# ---------------------------------------------------------------------------
# domain_classify tests
# ---------------------------------------------------------------------------

from domain_classify import (
    Domain,
    DomainScore,
    ClassificationResult,
    _score_text,
    classify,
)


class TestDomainScoring:
    """Test keyword scoring engine."""

    def test_cad_keywords_score(self):
        from domain_classify import _CAD_KEYWORDS
        score, evidence = _score_text("solidworks extrude fillet sketch", _CAD_KEYWORDS)
        assert score > 0
        assert any("solidworks" in e for e in evidence)

    def test_cam_keywords_score(self):
        from domain_classify import _CAM_KEYWORDS
        score, evidence = _score_text("toolpath roughing adaptive stepover", _CAM_KEYWORDS)
        assert score > 0
        assert any("toolpath" in e for e in evidence)

    def test_shop_keywords_score(self):
        from domain_classify import _SHOP_KEYWORDS
        score, evidence = _score_text("fanuc haas cnc machine workholding vise", _SHOP_KEYWORDS)
        assert score > 0
        assert any("fanuc" in e for e in evidence)

    def test_no_keywords(self):
        from domain_classify import _CAD_KEYWORDS
        score, evidence = _score_text("completely unrelated text about cooking", _CAD_KEYWORDS)
        assert score == 0.0
        assert evidence == []

    def test_diminishing_returns(self):
        """Repeated keywords should cap at 3x weight."""
        from domain_classify import _CAD_KEYWORDS
        text_1x = "solidworks"
        text_5x = "solidworks solidworks solidworks solidworks solidworks"
        score_1, _ = _score_text(text_1x, _CAD_KEYWORDS)
        score_5, _ = _score_text(text_5x, _CAD_KEYWORDS)
        # 5 occurrences capped at 3
        assert score_5 == score_1 * 3


class TestDomainClassification:
    """Test the classify() function."""

    def test_cad_video(self):
        result = classify(
            title="SolidWorks Tutorial - Extrude and Fillet",
            transcript="In this solidworks tutorial we'll sketch a profile and extrude it. "
                       "Then we add fillets and chamfers to the parametric model.",
        )
        assert result.primary_domain == "cad"
        assert result.confidence > 0.3

    def test_cam_video(self):
        result = classify(
            title="Mastercam Toolpath Tutorial - Roughing and Finishing",
            transcript="We set up the toolpath for roughing with adaptive clearing. "
                       "Then create a finishing pass with a ball nose end mill. "
                       "Feed rate is 30 ipm with 0.010 stepover.",
        )
        assert result.primary_domain == "cam"
        assert result.confidence > 0.3

    def test_shop_video(self):
        result = classify(
            title="Haas VF-2 Setup - Workholding and Tool Setting",
            transcript="First we put the part in the vise on the cnc machine. "
                       "Then touch off with the edge finder to set the work offset g54. "
                       "The fanuc controller shows the coordinates.",
        )
        assert result.primary_domain == "shop"
        assert result.confidence > 0.3

    def test_multi_domain(self):
        result = classify(
            title="Fusion 360 CAD to CAM Complete Tutorial",
            transcript="First we sketch and extrude the part in cad. "
                       "Then switch to the cam workspace to create toolpaths. "
                       "We set up roughing with an end mill and add finishing passes. "
                       "The parametric model drives the toolpath.",
            multi_threshold=0.6,
        )
        # Should detect both CAD and CAM signals
        assert len(result.scores) == 3
        cad_score = next(s for s in result.scores if s.domain == "cad")
        cam_score = next(s for s in result.scores if s.domain == "cam")
        assert cad_score.score > 0
        assert cam_score.score > 0

    def test_unknown_domain(self):
        result = classify(title="", transcript="")
        assert result.primary_domain == "unknown"
        assert result.confidence == 0.0

    def test_title_weight(self):
        """Title should have 3x the weight of transcript."""
        result_title = classify(title="SolidWorks Tutorial", transcript="")
        result_transcript = classify(title="", transcript="SolidWorks Tutorial")
        # Title-only should have higher CAD score relative contribution
        cad_title = next(s for s in result_title.scores if s.domain == "cad")
        cad_trans = next(s for s in result_transcript.scores if s.domain == "cad")
        assert cad_title.score >= cad_trans.score

    def test_classification_result_serialization(self):
        result = classify(title="Mastercam", transcript="toolpath roughing")
        d = result.to_dict()
        assert "primary_domain" in d
        assert "confidence" in d
        assert "scores" in d
        assert len(d["scores"]) == 3


# ---------------------------------------------------------------------------
# platform_detect tests
# ---------------------------------------------------------------------------

from platform_detect import (
    PlatformMatch,
    PlatformDetectionResult,
    _detect_in_text,
    detect,
    _is_controller,
)


class TestPlatformDetection:
    """Test software detection engine."""

    def test_detect_solidworks(self):
        matches = _detect_in_text("Using SolidWorks 2024 SP3", "title", 0.9)
        assert len(matches) >= 1
        sw = next(m for m in matches if m.name == "SolidWorks")
        assert sw.version is not None
        assert "2024" in sw.version

    def test_detect_fusion360(self):
        matches = _detect_in_text("Autodesk Fusion 360 tutorial", "title", 0.9)
        assert any(m.name == "Fusion 360" for m in matches)

    def test_detect_mastercam(self):
        matches = _detect_in_text("mastercam 2024 toolpath", "transcript", 0.7)
        assert any(m.name == "Mastercam" for m in matches)

    def test_detect_fanuc_controller(self):
        matches = _detect_in_text("fanuc 0i-MF controller", "transcript", 0.7)
        assert any(m.name == "Fanuc" for m in matches)

    def test_detect_haas_controller(self):
        matches = _detect_in_text("Haas NGC v3.2", "transcript", 0.7)
        assert any(m.name == "Haas" for m in matches)

    def test_no_match(self):
        matches = _detect_in_text("just a random cooking video", "title", 0.9)
        assert len(matches) == 0

    def test_version_extraction(self):
        matches = _detect_in_text("freecad v0.21.2", "title", 0.9)
        fc = next(m for m in matches if m.name == "FreeCAD")
        assert fc.version == "0.21.2"

    def test_confidence_boost_with_version(self):
        matches_no_ver = _detect_in_text("solidworks", "title", 0.5)
        matches_ver = _detect_in_text("solidworks 2024", "title", 0.5)
        sw_no = next(m for m in matches_no_ver if m.name == "SolidWorks")
        sw_yes = next(m for m in matches_ver if m.name == "SolidWorks")
        assert sw_yes.confidence > sw_no.confidence


class TestPlatformDetectFull:
    """Test the full detect() function."""

    def test_multi_source_detection(self):
        result = detect(
            title="SolidWorks 2024 Tutorial",
            transcript="In this tutorial we use solidworks to design and then "
                       "generate toolpaths in mastercam for the haas cnc machine.",
        )
        assert result.primary_platform is not None
        assert result.primary_platform.name == "SolidWorks"
        assert len(result.all_platforms) >= 2

    def test_controller_separation(self):
        result = detect(
            title="CNC Machining on Haas VF-2",
            transcript="Using mastercam to program the haas machine with fanuc controls.",
        )
        assert result.controller is not None
        assert result.controller.name in ("Haas", "Fanuc")

    def test_no_detection(self):
        result = detect(title="", transcript="")
        assert result.primary_platform is None
        assert result.all_platforms == []
        assert result.controller is None

    def test_title_highest_confidence(self):
        result = detect(
            title="Fusion 360",
            transcript="fusion 360",
            ocr_text="fusion 360",
        )
        assert result.primary_platform is not None
        # Title source gets 0.9 base confidence
        assert result.primary_platform.source == "title"

    def test_vision_text_source(self):
        result = detect(vision_text="SolidWorks 2023 interface visible")
        assert result.primary_platform is not None
        assert result.primary_platform.source == "vision"

    def test_is_controller(self):
        assert _is_controller("Fanuc")
        assert _is_controller("Haas")
        assert _is_controller("Siemens Sinumerik")
        assert not _is_controller("SolidWorks")
        assert not _is_controller("Mastercam")
        assert not _is_controller("NonExistent")

    def test_serialization(self):
        result = detect(title="SolidWorks 2024")
        d = result.to_dict()
        assert "primary_platform" in d
        assert "all_platforms" in d
        assert d["primary_platform"]["name"] == "SolidWorks"

    def test_deduplication(self):
        """Same platform from multiple sources should merge."""
        result = detect(
            title="SolidWorks tutorial",
            transcript="In solidworks we can extrude",
            ocr_text="solidworks 2024",
        )
        sw_count = sum(1 for p in result.all_platforms if p.name == "SolidWorks")
        assert sw_count == 1  # Deduplicated

    def test_version_merge(self):
        """Version from lower-confidence source should merge into match."""
        result = detect(
            title="SolidWorks tutorial",  # no version, high confidence
            ocr_text="solidworks 2024",   # version, lower confidence
        )
        sw = next(p for p in result.all_platforms if p.name == "SolidWorks")
        assert sw.version is not None


# ---------------------------------------------------------------------------
# ui_ocr tests (unit tests without Tesseract)
# ---------------------------------------------------------------------------

from ui_ocr import (
    OCRRegion,
    OCRResult,
    preprocess_for_ocr,
    extract_ui_elements,
)


class TestOCRPreprocessing:
    """Test image preprocessing for OCR."""

    def test_preprocess_grayscale(self):
        from PIL import Image
        img = Image.new("RGB", (200, 200), (128, 64, 32))
        result = preprocess_for_ocr(img, upscale=False, sharpen=False, binarize=False)
        assert result.mode == "L"

    def test_preprocess_upscale_small(self):
        from PIL import Image
        img = Image.new("L", (400, 300))
        result = preprocess_for_ocr(img, upscale=True, sharpen=False)
        assert result.width > 400
        assert result.height > 300

    def test_preprocess_no_upscale_large(self):
        from PIL import Image
        img = Image.new("L", (1920, 1080))
        result = preprocess_for_ocr(img, upscale=True, sharpen=False)
        assert result.width == 1920  # Already large enough

    def test_preprocess_binarize(self):
        from PIL import Image
        img = Image.new("L", (100, 100), 200)
        result = preprocess_for_ocr(img, upscale=False, sharpen=False, binarize=True, threshold=128)
        pixels = list(result.tobytes())
        assert all(p == 255 for p in pixels)  # All above threshold

    def test_preprocess_binarize_dark(self):
        from PIL import Image
        img = Image.new("L", (100, 100), 50)
        # autocontrast will stretch this, but binarize at 128 should work
        result = preprocess_for_ocr(img, upscale=False, sharpen=False, binarize=True, threshold=128)
        # After autocontrast of uniform image, result is uniform
        pixels = list(result.tobytes())
        assert len(set(pixels)) <= 2  # Binary


class TestUIElementExtraction:
    """Test UI element identification from OCR regions."""

    def test_detect_menus(self):
        ocr = OCRResult("frame.jpg", "", regions=[
            OCRRegion("File", 90, 0, 0, 50, 20),
            OCRRegion("Edit", 90, 50, 0, 50, 20),
            OCRRegion("View", 90, 100, 0, 50, 20),
            OCRRegion("Tools", 90, 150, 0, 50, 20),
        ])
        elements = extract_ui_elements(ocr)
        assert "File" in elements["menus"]
        assert "Edit" in elements["menus"]
        assert "Tools" in elements["menus"]

    def test_detect_parameters(self):
        ocr = OCRResult("frame.jpg", "", regions=[
            OCRRegion("12.5mm", 90, 100, 200, 60, 20),
            OCRRegion("45.0deg", 90, 100, 220, 60, 20),
            OCRRegion("1200rpm", 90, 100, 240, 60, 20),
        ])
        elements = extract_ui_elements(ocr)
        assert len(elements["parameters"]) >= 2

    def test_detect_coordinates(self):
        ocr = OCRResult("frame.jpg", "", regions=[
            OCRRegion("X 125.400", 90, 500, 600, 80, 20),
            OCRRegion("Y -30.100", 90, 500, 620, 80, 20),
            OCRRegion("Z 50.000", 90, 500, 640, 80, 20),
        ])
        elements = extract_ui_elements(ocr)
        assert len(elements["coordinates"]) == 3

    def test_detect_labels(self):
        ocr = OCRResult("frame.jpg", "", regions=[
            OCRRegion("Extrude Boss", 90, 10, 100, 100, 20),
            OCRRegion("Fillet", 90, 10, 120, 80, 20),
        ])
        elements = extract_ui_elements(ocr)
        assert "Extrude Boss" in elements["labels"]
        assert "Fillet" in elements["labels"]


# ---------------------------------------------------------------------------
# vision_analyze tests (without API calls)
# ---------------------------------------------------------------------------

from vision_analyze import (
    AnalysisMode,
    FrameAnalysis,
    VisionAnalysisResult,
    _extract_json,
    _summarize_elements,
)


class TestJSONExtraction:
    """Test JSON extraction from Claude responses."""

    def test_json_in_code_fence(self):
        text = 'Here is the analysis:\n```json\n{"software": "SolidWorks", "version": "2024"}\n```'
        result = _extract_json(text)
        assert result["software"] == "SolidWorks"

    def test_raw_json(self):
        text = '{"software": "Mastercam", "operation": "roughing"}'
        result = _extract_json(text)
        assert result["software"] == "Mastercam"

    def test_json_in_text(self):
        text = 'The analysis shows {"software": "FreeCAD", "mode": "sketch"} in the image.'
        result = _extract_json(text)
        assert result["software"] == "FreeCAD"

    def test_no_json(self):
        text = "This is just plain text with no JSON at all."
        result = _extract_json(text)
        assert result == {}

    def test_malformed_json(self):
        text = '```json\n{broken json here}\n```'
        result = _extract_json(text)
        assert result == {}


class TestElementSummary:
    """Test element summarization."""

    def test_basic_summary(self):
        elements = {
            "software": "SolidWorks 2024",
            "operation": "extrude",
            "parameters": None,
        }
        summary = _summarize_elements(elements)
        assert "software: SolidWorks 2024" in summary
        assert "operation: extrude" in summary

    def test_list_elements(self):
        elements = {"features": ["extrude", "fillet", "chamfer", "hole", "pattern"]}
        summary = _summarize_elements(elements)
        assert "extrude" in summary
        assert "fillet" in summary
        assert "chamfer" in summary

    def test_null_values_skipped(self):
        elements = {"software": "null", "operation": None, "tool": "end mill"}
        summary = _summarize_elements(elements)
        assert "software" not in summary
        assert "tool: end mill" in summary


class TestVisionAnalysisResult:
    """Test VisionAnalysisResult serialization."""

    def test_serialization(self):
        fa = FrameAnalysis(
            frame_path="frame_001.jpg",
            timestamp_seconds=10.0,
            mode="cad",
            description="SolidWorks interface",
            elements={"software": "SolidWorks"},
        )
        result = VisionAnalysisResult(
            video_id="test123",
            mode="cad",
            frame_analyses=[fa],
            summary="Analyzed 1 frame",
            unique_insights=["[10s] software: SolidWorks"],
        )
        d = result.to_dict()
        assert d["video_id"] == "test123"
        assert len(d["frame_analyses"]) == 1
        assert d["frame_analyses"][0]["mode"] == "cad"

    def test_analysis_modes(self):
        assert AnalysisMode.CAD.value == "cad"
        assert AnalysisMode.CAM.value == "cam"
        assert AnalysisMode.SHOP.value == "shop"
        assert AnalysisMode.GENERAL.value == "general"


# ---------------------------------------------------------------------------
# frame_extract tests (without ffmpeg)
# ---------------------------------------------------------------------------

from frame_extract import (
    ExtractedFrame,
    FrameExtractionResult,
)


class TestFrameExtractionResult:
    """Test frame extraction data structures."""

    def test_extracted_frame_serialization(self):
        frame = ExtractedFrame(
            path="scene_0001.jpg",
            timestamp_seconds=5.0,
            frame_number=0,
            width=1920,
            height=1080,
            scene_score=0.45,
        )
        d = frame.to_dict()
        assert d["path"] == "scene_0001.jpg"
        assert d["timestamp_seconds"] == 5.0
        assert d["width"] == 1920

    def test_extraction_result_serialization(self):
        frames = [
            ExtractedFrame("f1.jpg", 0.0, 0, 1920, 1080),
            ExtractedFrame("f2.jpg", 10.0, 1, 1920, 1080),
        ]
        result = FrameExtractionResult(
            video_path="video.mp4",
            total_frames=2,
            duration_seconds=120.0,
            frames=frames,
        )
        d = result.to_dict()
        assert d["total_frames"] == 2
        assert d["duration_seconds"] == 120.0
        assert len(d["frames"]) == 2


# ---------------------------------------------------------------------------
# Integration: End-to-end pipeline with mocked externals
# ---------------------------------------------------------------------------

class TestPipelineIntegration:
    """Test the full pipeline flow with synthetic data."""

    def test_classify_then_detect(self):
        """Classification and detection should agree on domain."""
        title = "Mastercam 2024 - 3-Axis Roughing Toolpath Tutorial on Haas VF-2"
        transcript = (
            "Today we'll create a roughing toolpath in Mastercam 2024. "
            "We're running this on a Haas VF-2 with Fanuc controls. "
            "First set up the stock geometry, then select a 0.5 inch end mill. "
            "Set the stepover to 40% and depth of cut to 0.050 inches. "
            "The feed rate is 30 ipm at 6000 rpm."
        )

        # Classify
        cls_result = classify(title=title, transcript=transcript)
        assert cls_result.primary_domain == "cam"

        # Detect platforms
        det_result = detect(title=title, transcript=transcript)
        assert det_result.primary_platform is not None
        platform_names = [p.name for p in det_result.all_platforms]
        assert "Mastercam" in platform_names
        assert det_result.controller is not None
        controller_names = [det_result.controller.name]
        assert any(c in ("Haas", "Fanuc") for c in controller_names)

    def test_cad_tutorial_pipeline(self):
        """Full pipeline for a CAD tutorial."""
        title = "SolidWorks 2024 - Parametric Part Design Tutorial"
        transcript = (
            "Open SolidWorks and create a new part. Sketch a rectangle on the "
            "front plane. Add dimensions: 100mm x 50mm. Extrude the sketch 25mm. "
            "Add fillets of 5mm radius to the top edges. Then create a shell "
            "with 2mm wall thickness. Save as STEP file for manufacturing."
        )

        cls = classify(title=title, transcript=transcript)
        assert cls.primary_domain == "cad"
        assert cls.confidence > 0.5

        det = detect(title=title, transcript=transcript)
        assert det.primary_platform.name == "SolidWorks"
        assert det.primary_platform.version is not None

    def test_shop_tutorial_pipeline(self):
        """Full pipeline for a shop floor tutorial."""
        title = "Setting Up a Part on the Haas VF-2 - Work Offsets and Tool Setting"
        transcript = (
            "Put the part in the vise on the machining center. Use the edge finder "
            "to locate X and Y zero. Touch off the Z with a 1-2-3 block. Enter the "
            "work offset into G54. Set the tool offset for each tool using the tool "
            "setter. Check the coordinates on the Haas controller display."
        )

        cls = classify(title=title, transcript=transcript)
        assert cls.primary_domain == "shop"

        det = detect(title=title, transcript=transcript)
        assert det.controller is not None
        assert det.controller.name == "Haas"

    def test_pipeline_result_json_roundtrip(self):
        """All results should survive JSON serialization."""
        cls = classify(title="SolidWorks extrude", transcript="fillet chamfer")
        det = detect(title="SolidWorks 2024", transcript="mastercam toolpath")

        cls_json = json.dumps(cls.to_dict())
        det_json = json.dumps(det.to_dict())

        cls_data = json.loads(cls_json)
        det_data = json.loads(det_json)

        assert cls_data["primary_domain"] in ("cad", "cam", "shop", "multi", "unknown")
        assert det_data["primary_platform"]["name"] == "SolidWorks"

    def test_all_software_db_entries_detectable(self):
        """Every entry in the software DB should match its own name."""
        from platform_detect import _SOFTWARE_DB
        for name, patterns, category in _SOFTWARE_DB:
            matches = _detect_in_text(name.lower(), "test", 0.5)
            assert len(matches) >= 1, f"'{name}' should match itself"

    def test_ocr_to_classifier_flow(self):
        """OCR text should feed into the classifier."""
        ocr_text = (
            "File Edit View Insert Tools Window Help\n"
            "Extrude1 Cut-Extrude1 Fillet1\n"
            "D1 = 25.000mm D2 = 12.500mm\n"
            "X: 0.000 Y: 0.000 Z: 25.000\n"
        )
        result = classify(ocr_text=ocr_text)
        # Should detect CAD signals from menu items and operations
        cad_score = next(s for s in result.scores if s.domain == "cad")
        assert cad_score.score > 0

    def test_vision_text_to_detector_flow(self):
        """Vision analysis text should feed into platform detection."""
        vision_text = (
            "The screenshot shows the Fusion 360 interface with the CAM workspace active. "
            "A roughing toolpath is visible on a aluminum part. The tool is a 3-flute "
            "0.5 inch end mill running at 10000 rpm."
        )
        result = detect(vision_text=vision_text)
        assert result.primary_platform is not None
        assert result.primary_platform.name == "Fusion 360"
        assert result.primary_platform.source == "vision"


# ---------------------------------------------------------------------------
# Edge cases and robustness
# ---------------------------------------------------------------------------

class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_unicode_in_text(self):
        classify(title="CNC Tutorial \u2014 5-Axis", transcript="\u00b5m tolerance")

    def test_very_long_transcript(self):
        long_text = "solidworks extrude " * 10000
        result = classify(transcript=long_text)
        assert result.primary_domain == "cad"

    def test_mixed_case_detection(self):
        result = detect(title="SOLIDWORKS 2024 TUTORIAL")
        assert result.primary_platform is not None
        assert result.primary_platform.name == "SolidWorks"

    def test_all_sources_empty(self):
        cls = classify()
        assert cls.primary_domain == "unknown"
        det = detect()
        assert det.primary_platform is None

    def test_confidence_capped_at_1(self):
        result = detect(
            title="SolidWorks 2024 tutorial",
            vision_text="SolidWorks 2024 interface",
        )
        for p in result.all_platforms:
            assert p.confidence <= 1.0

    def test_multiple_controllers(self):
        result = detect(transcript="switching from fanuc to siemens sinumerik 840d")
        controllers = [p for p in result.all_platforms if _is_controller(p.name)]
        assert len(controllers) >= 2
