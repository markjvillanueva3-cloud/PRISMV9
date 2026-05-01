"""Tests for Catalog Data Extraction — CC-EXT-MS1-P0-U05."""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.extraction.catalog_extractor import (
    ToolSpecification,
    CuttingDataEntry,
    CatalogExtractionResult,
    CatalogExtractor,
    detect_manufacturer,
    parse_iso_designation,
)


# ---------------------------------------------------------------------------
# ISO Designation Parsing
# ---------------------------------------------------------------------------

class TestISODesignationParsing:
    def test_cnmg_designation(self):
        result = parse_iso_designation("Insert CNMG 120408 for turning")
        assert len(result) >= 1
        assert "CNMG" in result[0]

    def test_dnmg_designation(self):
        result = parse_iso_designation("Use DNMG 150608 insert")
        assert len(result) >= 1
        assert "DNMG" in result[0]

    def test_wnmg_designation(self):
        result = parse_iso_designation("WNMG 080404 for light cuts")
        assert len(result) >= 1
        assert "WNMG" in result[0]

    def test_multiple_designations(self):
        text = "Choose CNMG 120408 or DNMG 150604 depending on application"
        result = parse_iso_designation(text)
        assert len(result) >= 2

    def test_ccmt_designation(self):
        result = parse_iso_designation("CCMT 060204 for finishing")
        assert len(result) >= 1
        assert "CCMT" in result[0]

    def test_no_designation_in_generic_text(self):
        result = parse_iso_designation("General machining guidelines")
        assert len(result) == 0

    def test_case_insensitive(self):
        result = parse_iso_designation("cnmg 120408 insert")
        assert len(result) >= 1
        assert "CNMG" in result[0]

    def test_designation_with_suffix(self):
        result = parse_iso_designation("CNMG120408-PM for steel")
        assert len(result) >= 1


# ---------------------------------------------------------------------------
# Manufacturer Detection
# ---------------------------------------------------------------------------

class TestManufacturerDetection:
    def test_sandvik(self):
        assert detect_manufacturer("Sandvik Coromant catalog") == "sandvik"

    def test_sandvik_coromill(self):
        assert detect_manufacturer("CoroMill 390 end mill") == "sandvik"

    def test_kennametal(self):
        assert detect_manufacturer("Kennametal tooling catalog") == "kennametal"

    def test_iscar(self):
        assert detect_manufacturer("Iscar turning inserts") == "iscar"

    def test_walter(self):
        assert detect_manufacturer("Walter Tiger-Tec Gold") == "walter"

    def test_mitsubishi(self):
        assert detect_manufacturer("Mitsubishi Materials carbide") == "mitsubishi"

    def test_seco(self):
        assert detect_manufacturer("Seco Jabro end mills") == "seco"

    def test_kyocera(self):
        assert detect_manufacturer("Kyocera Ceratip inserts") == "kyocera"

    def test_unknown_manufacturer(self):
        assert detect_manufacturer("Generic tooling text") == ""

    def test_case_insensitive(self):
        assert detect_manufacturer("SANDVIK COROMANT") == "sandvik"


# ---------------------------------------------------------------------------
# Tool Specification Dataclass
# ---------------------------------------------------------------------------

class TestToolSpecification:
    def test_default_values(self):
        spec = ToolSpecification()
        assert spec.part_number == ""
        assert spec.tool_type == ""
        assert spec.confidence == 0.7

    def test_to_dict(self):
        spec = ToolSpecification(
            part_number="CNMG120408",
            iso_designation="CNMG120408",
            tool_type="insert",
            grade="carbide",
            coating="TiAlN",
            manufacturer="sandvik",
        )
        d = spec.to_dict()
        assert d["part_number"] == "CNMG120408"
        assert d["tool_type"] == "insert"
        assert d["grade"] == "carbide"
        assert d["coating"] == "TiAlN"
        assert d["manufacturer"] == "sandvik"
        assert d["confidence"] == 0.7

    def test_geometry_in_dict(self):
        spec = ToolSpecification(geometry={"nose_radius_mm": 0.8})
        d = spec.to_dict()
        assert d["geometry"]["nose_radius_mm"] == 0.8


# ---------------------------------------------------------------------------
# Cutting Data Entry Dataclass
# ---------------------------------------------------------------------------

class TestCuttingDataEntry:
    def test_speed_in_dict(self):
        entry = CuttingDataEntry(
            speed_min=100.0, speed_max=200.0, speed_unit="m/min",
        )
        d = entry.to_dict()
        assert d["speed"]["min"] == 100.0
        assert d["speed"]["max"] == 200.0

    def test_feed_in_dict(self):
        entry = CuttingDataEntry(
            feed_min=0.1, feed_max=0.3, feed_unit="mm/rev",
        )
        d = entry.to_dict()
        assert d["feed"]["min"] == 0.1
        assert d["feed"]["max"] == 0.3

    def test_doc_in_dict(self):
        entry = CuttingDataEntry(doc_min=1.0, doc_max=3.0)
        d = entry.to_dict()
        assert d["doc"]["min"] == 1.0
        assert d["doc"]["max"] == 3.0

    def test_no_optional_fields(self):
        entry = CuttingDataEntry(tool_grade="GC4325", workpiece_material="steel")
        d = entry.to_dict()
        assert "speed" not in d
        assert "feed" not in d
        assert "doc" not in d

    def test_notes_and_footnotes(self):
        entry = CuttingDataEntry(notes="Use coolant", footnotes=["*Dry only"])
        d = entry.to_dict()
        assert d["notes"] == "Use coolant"
        assert d["footnotes"] == ["*Dry only"]


# ---------------------------------------------------------------------------
# Catalog Extraction Result Dataclass
# ---------------------------------------------------------------------------

class TestCatalogExtractionResult:
    def test_to_dict(self):
        result = CatalogExtractionResult(
            manufacturer="sandvik",
            catalog_title="Turning Guide",
            tools=[ToolSpecification(part_number="CNMG120408")],
            cutting_data=[CuttingDataEntry(speed_min=100.0, speed_max=200.0)],
            new_tools_count=1,
            discrepancy_count=0,
        )
        d = result.to_dict()
        assert d["manufacturer"] == "sandvik"
        assert d["tools_count"] == 1
        assert d["cutting_data_count"] == 1
        assert len(d["tools"]) == 1
        assert len(d["cutting_data"]) == 1


# ---------------------------------------------------------------------------
# CatalogExtractor — Tool Extraction
# ---------------------------------------------------------------------------

class TestCatalogExtractorTools:
    def test_extracts_iso_inserts(self):
        text = "Available inserts: CNMG 120408, DNMG 150608 in carbide grade."
        extractor = CatalogExtractor()
        result = extractor.extract(text, "Sandvik Turning Catalog")
        assert len(result.tools) >= 2

    def test_detects_manufacturer_from_title(self):
        text = "Inserts: CNMG 120408"
        extractor = CatalogExtractor()
        result = extractor.extract(text, "Sandvik Coromant Catalog")
        assert result.manufacturer == "sandvik"

    def test_detects_grade_near_designation(self):
        text = "CNMG 120408 carbide insert with TiAlN coating for steel."
        extractor = CatalogExtractor()
        result = extractor.extract(text, "Catalog")
        tool = result.tools[0]
        assert tool.grade == "carbide"

    def test_detects_coating_near_designation(self):
        text = "CNMG 120408 carbide insert with TiAlN coating for steel."
        extractor = CatalogExtractor()
        result = extractor.extract(text, "Catalog")
        tool = result.tools[0]
        assert tool.coating == "TiAlN"

    def test_detects_geometry(self):
        text = "CNMG 120408 with nose radius: 0.8 mm and rake angle: 5°"
        extractor = CatalogExtractor()
        result = extractor.extract(text, "Catalog")
        tool = result.tools[0]
        assert tool.geometry.get("nose_radius_mm") == 0.8
        assert tool.geometry.get("rake_angle_deg") == 5.0

    def test_no_duplicate_iso_and_part_number(self):
        text = "Sandvik CNMG 120408 insert for turning"
        extractor = CatalogExtractor()
        result = extractor.extract(text, "Sandvik Catalog")
        # Should not have both ISO and part_number duplicates
        designations = [t.iso_designation for t in result.tools]
        # Count unique non-empty designations
        non_empty = [d for d in designations if d]
        assert len(non_empty) == len(set(non_empty))

    def test_empty_text(self):
        extractor = CatalogExtractor()
        result = extractor.extract("", "Empty Catalog")
        assert len(result.tools) == 0
        assert len(result.cutting_data) == 0


# ---------------------------------------------------------------------------
# CatalogExtractor — Cross-Reference
# ---------------------------------------------------------------------------

class TestCatalogExtractorCrossReference:
    def test_counts_new_tools(self):
        existing_db = {"DNMG150608": {"grade": "carbide"}}
        text = "Available: CNMG 120408, DNMG 150608"
        extractor = CatalogExtractor(existing_tool_db=existing_db)
        result = extractor.extract(text, "Catalog")
        # CNMG120408 is new (not in DB)
        assert result.new_tools_count >= 1

    def test_detects_grade_discrepancy(self):
        existing_db = {"CNMG120408": {"grade": "cermet"}}
        text = "CNMG 120408 carbide insert"
        extractor = CatalogExtractor(existing_tool_db=existing_db)
        result = extractor.extract(text, "Catalog")
        # Grade mismatch: catalog says carbide, DB says cermet
        assert result.discrepancy_count >= 1

    def test_no_discrepancy_when_matching(self):
        existing_db = {"CNMG120408": {"grade": "carbide"}}
        text = "CNMG 120408 carbide insert"
        extractor = CatalogExtractor(existing_tool_db=existing_db)
        result = extractor.extract(text, "Catalog")
        assert result.discrepancy_count == 0

    def test_no_discrepancy_when_no_grade(self):
        existing_db = {"CNMG120408": {"grade": "carbide"}}
        text = "CNMG 120408 insert"
        extractor = CatalogExtractor(existing_tool_db=existing_db)
        result = extractor.extract(text, "Catalog")
        assert result.discrepancy_count == 0


# ---------------------------------------------------------------------------
# CatalogExtractor — Grade/Coating Detection
# ---------------------------------------------------------------------------

class TestGradeDetection:
    def test_carbide(self):
        extractor = CatalogExtractor()
        assert extractor._detect_grade("cemented carbide insert") == "carbide"

    def test_cermet(self):
        extractor = CatalogExtractor()
        assert extractor._detect_grade("cermet grade for finishing") == "cermet"

    def test_ceramic(self):
        extractor = CatalogExtractor()
        assert extractor._detect_grade("ceramic Al2O3 insert") == "ceramic"

    def test_cbn(self):
        extractor = CatalogExtractor()
        assert extractor._detect_grade("CBN cubic boron nitride") == "cbn"

    def test_pcd(self):
        extractor = CatalogExtractor()
        assert extractor._detect_grade("PCD diamond tooling") == "pcd"

    def test_hss(self):
        extractor = CatalogExtractor()
        assert extractor._detect_grade("HSS high speed steel drill") == "hss"

    def test_unknown_grade(self):
        extractor = CatalogExtractor()
        assert extractor._detect_grade("general purpose tool") == ""


class TestCoatingDetection:
    def test_tialn(self):
        extractor = CatalogExtractor()
        assert extractor._detect_coating("TiAlN coated insert") == "TiAlN"

    def test_ticn(self):
        extractor = CatalogExtractor()
        assert extractor._detect_coating("TiCN coating for wear") == "TiCN"

    def test_cvd(self):
        extractor = CatalogExtractor()
        assert extractor._detect_coating("CVD coated carbide") == "CVD"

    def test_pvd(self):
        extractor = CatalogExtractor()
        assert extractor._detect_coating("PVD coating process") == "PVD"

    def test_no_coating(self):
        extractor = CatalogExtractor()
        assert extractor._detect_coating("uncoated insert") == ""


# ---------------------------------------------------------------------------
# CatalogExtractor — Geometry Detection
# ---------------------------------------------------------------------------

class TestGeometryDetection:
    def test_nose_radius(self):
        extractor = CatalogExtractor()
        geo = extractor._detect_geometry("nose radius: 0.4 mm for finishing")
        assert geo["nose_radius_mm"] == 0.4

    def test_corner_radius(self):
        extractor = CatalogExtractor()
        geo = extractor._detect_geometry("corner radius 1.2 mm")
        assert geo["nose_radius_mm"] == 1.2

    def test_rake_angle(self):
        extractor = CatalogExtractor()
        geo = extractor._detect_geometry("rake angle: -6°")
        assert geo["rake_angle_deg"] == -6.0

    def test_no_geometry(self):
        extractor = CatalogExtractor()
        geo = extractor._detect_geometry("general insert description")
        assert len(geo) == 0
