"""Tests for CMM Data Import — CC-EXT-MS4 P0-U01.

Covers: DMIS parsing, QIF XML import, Calypso vendor adaptation,
surface finish extraction, tolerance evaluation, traceability,
format auto-detection, edge cases.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.quality.inspection_schema import (
    FeatureType,
    InspectionFeature,
    InspectionResult,
    InspectionSession,
    SurfaceFinishResult,
    ToleranceStatus,
    VendorFormat,
)
from src.quality.cmm_importer import (
    CMMImporter,
    DMISParser,
    QIFParser,
)


# ---------------------------------------------------------------------------
# Sample DMIS content
# ---------------------------------------------------------------------------

SAMPLE_DMIS = """\
PARTID/'BRACKET-001'
MACHIN/'CMM-DEA-GLOBAL'
DATSET/'OP-SMITH'
$$
$$ Milling inspection - 4 features
$$
FEAT/HOLE1,CIRCLE,CART,25.000,50.000,0.000,0.000,0.000,1.000
MEAS/HOLE1,CART,25.012,50.003,0.000
TOL/HOLE1,INTOL,0.025,-0.025,0.012

FEAT/HOLE2,CIRCLE,CART,75.000,50.000,0.000,0.000,0.000,1.000
MEAS/HOLE2,CART,75.008,49.997,0.000
TOL/HOLE2,INTOL,0.025,-0.025,0.008

FEAT/SURF1,PLANE,CART,50.000,25.000,10.000,0.000,0.000,1.000
MEAS/SURF1,CART,50.000,25.000,10.015
TOL/SURF1,INTOL,0.020,-0.020,0.015

FEAT/BORE1,CYLNDR,CART,50.000,50.000,0.000,0.000,0.000,1.000
MEAS/BORE1,CART,50.035,50.001,0.000
TOL/BORE1,OUTTOL,0.020,-0.020,0.035

SNSET/ROUGHA,0.80
SNSET/ROUGHZ,4.20
SNSET/ROUGHA,1.60
SNSET/ROUGHZ,8.10

ENDMES
"""

SAMPLE_PCDMIS = """\
FILNAM/'bracket_prog_v3'
PARTID/'FLANGE-042'
MACHIN/'HEXAGON-OPTIV'
$$
F(DIA1)=FEAT/CIRCLE,CART,30.000,40.000,0.000,0.000,0.000,1.000
M(DIA1)=MEAS/CART,30.005,40.002,0.000
T(DIA1)=TOL/POSIT,0.015,-0.015,INTOL,0.005

F(FLAT1)=FEAT/PLANE,CART,0.000,0.000,5.000,0.000,0.000,1.000
M(FLAT1)=MEAS/CART,0.000,0.000,5.008
T(FLAT1)=TOL/FLATNS,0.010,-0.010,INTOL,0.008

F(DIA2)=FEAT/CIRCLE,CART,60.000,40.000,0.000,0.000,0.000,1.000
M(DIA2)=MEAS/CART,60.018,40.001,0.000
T(DIA2)=TOL/POSIT,0.015,-0.015,OUTTOL,0.018

SNSET/ROUGHA,0.40
ENDMES
"""


# ---------------------------------------------------------------------------
# Sample QIF content
# ---------------------------------------------------------------------------

SAMPLE_QIF = """\
<?xml version="1.0" encoding="UTF-8"?>
<QIFResults>
  <PartNumber>HOUSING-007</PartNumber>
  <InstrumentId>ZEISS-CONTURA</InstrumentId>
  <OperatorId>OP-JONES</OperatorId>
  <MeasurementResults>
    <DiameterActual>
      <Name>BoreA</Name>
      <NominalValue>25.000</NominalValue>
      <Value>25.008</Value>
      <Deviation>0.008</Deviation>
      <UpperTolerance>0.013</UpperTolerance>
      <LowerTolerance>-0.013</LowerTolerance>
      <Status>PASS</Status>
    </DiameterActual>
    <FlatnessCharacteristicActual>
      <Name>TopSurface</Name>
      <NominalValue>0.000</NominalValue>
      <Value>0.006</Value>
      <Deviation>0.006</Deviation>
      <UpperTolerance>0.010</UpperTolerance>
      <LowerTolerance>0.000</LowerTolerance>
      <Status>PASS</Status>
    </FlatnessCharacteristicActual>
    <PositionCharacteristicActual>
      <Name>Hole1Pos</Name>
      <NominalValue>0.000</NominalValue>
      <Value>0.022</Value>
      <Deviation>0.022</Deviation>
      <UpperTolerance>0.025</UpperTolerance>
      <LowerTolerance>0.000</LowerTolerance>
      <Status>PASS</Status>
    </PositionCharacteristicActual>
    <DiameterActual>
      <Name>BoreB</Name>
      <NominalValue>12.000</NominalValue>
      <Value>12.020</Value>
      <Deviation>0.020</Deviation>
      <UpperTolerance>0.015</UpperTolerance>
      <LowerTolerance>-0.015</LowerTolerance>
      <Status>FAIL</Status>
    </DiameterActual>
    <SurfaceRoughness>
      <Ra>0.80</Ra>
      <Rz>4.20</Rz>
    </SurfaceRoughness>
    <SurfaceRoughness>
      <Ra>1.20</Ra>
      <Rz>6.00</Rz>
      <Rq>1.50</Rq>
    </SurfaceRoughness>
  </MeasurementResults>
</QIFResults>
"""


# ---------------------------------------------------------------------------
# Sample Calypso content
# ---------------------------------------------------------------------------

SAMPLE_CALYPSO = """\
<?xml version="1.0" encoding="UTF-8"?>
<CMMResult>
  <Header>
    <PartNumber>SHAFT-019</PartNumber>
    <Machine>ZEISS-ACCURA</Machine>
  </Header>
  <Feature Name="OD1" Type="CIRCLE">
    <Nominal>20.000</Nominal>
    <Actual>20.005</Actual>
    <Deviation>0.005</Deviation>
    <UpperTolerance>0.010</UpperTolerance>
    <LowerTolerance>-0.010</LowerTolerance>
    <Status>OK</Status>
  </Feature>
  <Feature Name="LENGTH1" Type="DIST">
    <Nominal>100.000</Nominal>
    <Actual>100.012</Actual>
    <Deviation>0.012</Deviation>
    <UpperTolerance>0.020</UpperTolerance>
    <LowerTolerance>-0.020</LowerTolerance>
    <Status>OK</Status>
  </Feature>
  <Feature Name="RUNOUT1" Type="RUNOUT">
    <Nominal>0.000</Nominal>
    <Actual>0.018</Actual>
    <Deviation>0.018</Deviation>
    <UpperTolerance>0.015</UpperTolerance>
    <LowerTolerance>0.000</LowerTolerance>
    <Status>NOK</Status>
  </Feature>
</CMMResult>
"""


# ===========================================================================
# DMIS Parser Tests
# ===========================================================================

class TestDMISParser:

    def test_parse_standard_dmis(self):
        """Parse standard DMIS with 4 features."""
        parser = DMISParser()
        result = parser.parse(SAMPLE_DMIS)
        assert result.part_number == "BRACKET-001"
        assert result.cmm_model == "CMM-DEA-GLOBAL"
        assert result.operator_id == "OP-SMITH"
        assert len(result.features) == 4

    def test_feature_types_parsed(self):
        parser = DMISParser()
        result = parser.parse(SAMPLE_DMIS)
        types = {f.feature_name: f.feature_type for f in result.features}
        assert types["HOLE1"] == FeatureType.CIRCLE
        assert types["HOLE2"] == FeatureType.CIRCLE
        assert types["SURF1"] == FeatureType.PLANE
        assert types["BORE1"] == FeatureType.CYLINDER

    def test_nominal_values(self):
        parser = DMISParser()
        result = parser.parse(SAMPLE_DMIS)
        hole1 = next(f for f in result.features if f.feature_name == "HOLE1")
        assert hole1.nominal_x == 25.0
        assert hole1.nominal_y == 50.0

    def test_actual_values_from_meas(self):
        parser = DMISParser()
        result = parser.parse(SAMPLE_DMIS)
        hole1 = next(f for f in result.features if f.feature_name == "HOLE1")
        assert hole1.actual_x == 25.012
        assert hole1.actual_y == 50.003

    def test_tolerance_evaluation(self):
        parser = DMISParser()
        result = parser.parse(SAMPLE_DMIS)
        # HOLE1: deviation 0.012, tolerance ±0.025 → PASS
        hole1 = next(f for f in result.features if f.feature_name == "HOLE1")
        assert hole1.status == ToleranceStatus.PASS
        assert hole1.deviation == 0.012

        # BORE1: deviation 0.035, tolerance ±0.020 → FAIL
        bore1 = next(f for f in result.features if f.feature_name == "BORE1")
        assert bore1.status == ToleranceStatus.FAIL
        assert bore1.deviation == 0.035

    def test_surface_finish_extracted(self):
        parser = DMISParser()
        result = parser.parse(SAMPLE_DMIS)
        assert len(result.surface_finishes) == 2
        assert result.surface_finishes[0].ra == 0.80
        assert result.surface_finishes[0].rz == 4.20
        assert result.surface_finishes[1].ra == 1.60
        assert result.surface_finishes[1].rz == 8.10

    def test_pass_fail_counts(self):
        parser = DMISParser()
        result = parser.parse(SAMPLE_DMIS)
        assert result.pass_count == 3
        assert result.fail_count == 1

    def test_pass_rate(self):
        parser = DMISParser()
        result = parser.parse(SAMPLE_DMIS)
        assert result.pass_rate == 0.75  # 3/4

    def test_empty_dmis(self):
        parser = DMISParser()
        result = parser.parse("")
        assert len(result.features) == 0
        assert result.total_features == 0

    def test_dmis_vendor_format_set(self):
        parser = DMISParser()
        result = parser.parse(SAMPLE_DMIS)
        assert result.vendor_format == VendorFormat.DMIS_STANDARD


# ===========================================================================
# PC-DMIS Parser Tests
# ===========================================================================

class TestPCDMISParser:

    def test_parse_pcdmis(self):
        """Parse PC-DMIS format with F()=FEAT/ syntax."""
        parser = DMISParser(vendor=VendorFormat.PC_DMIS)
        result = parser.parse(SAMPLE_PCDMIS)
        assert result.part_number == "FLANGE-042"
        assert result.program_name == "bracket_prog_v3"
        assert len(result.features) == 3

    def test_pcdmis_feature_names(self):
        parser = DMISParser(vendor=VendorFormat.PC_DMIS)
        result = parser.parse(SAMPLE_PCDMIS)
        names = {f.feature_name for f in result.features}
        assert "DIA1" in names
        assert "FLAT1" in names
        assert "DIA2" in names

    def test_pcdmis_tolerance_status(self):
        parser = DMISParser(vendor=VendorFormat.PC_DMIS)
        result = parser.parse(SAMPLE_PCDMIS)
        dia2 = next(f for f in result.features if f.feature_name == "DIA2")
        assert dia2.status == ToleranceStatus.FAIL
        assert dia2.deviation == 0.018

    def test_pcdmis_surface_finish(self):
        parser = DMISParser(vendor=VendorFormat.PC_DMIS)
        result = parser.parse(SAMPLE_PCDMIS)
        assert len(result.surface_finishes) == 1
        assert result.surface_finishes[0].ra == 0.40


# ===========================================================================
# QIF Parser Tests
# ===========================================================================

class TestQIFParser:

    def test_parse_qif(self):
        """Parse QIF XML with 4 features + 2 surface finish."""
        parser = QIFParser()
        result = parser.parse(SAMPLE_QIF)
        assert result.part_number == "HOUSING-007"
        assert result.cmm_model == "ZEISS-CONTURA"
        assert result.operator_id == "OP-JONES"
        assert len(result.features) == 4

    def test_qif_feature_names(self):
        parser = QIFParser()
        result = parser.parse(SAMPLE_QIF)
        names = {f.feature_name for f in result.features}
        assert "BoreA" in names
        assert "TopSurface" in names
        assert "Hole1Pos" in names
        assert "BoreB" in names

    def test_qif_deviations(self):
        parser = QIFParser()
        result = parser.parse(SAMPLE_QIF)
        bore_a = next(f for f in result.features if f.feature_name == "BoreA")
        assert bore_a.deviation == 0.008
        assert bore_a.nominal_value == 25.0
        assert bore_a.actual_value == 25.008

    def test_qif_tolerance_status(self):
        parser = QIFParser()
        result = parser.parse(SAMPLE_QIF)
        bore_b = next(f for f in result.features if f.feature_name == "BoreB")
        assert bore_b.status == ToleranceStatus.FAIL
        assert bore_b.deviation == 0.020

    def test_qif_surface_finish(self):
        parser = QIFParser()
        result = parser.parse(SAMPLE_QIF)
        assert len(result.surface_finishes) == 2
        assert result.surface_finishes[0].ra == 0.80
        assert result.surface_finishes[0].rz == 4.20
        assert result.surface_finishes[1].rq == 1.50

    def test_qif_pass_rate(self):
        parser = QIFParser()
        result = parser.parse(SAMPLE_QIF)
        assert result.pass_count == 3
        assert result.fail_count == 1
        assert result.pass_rate == 0.75

    def test_qif_vendor_format(self):
        parser = QIFParser()
        result = parser.parse(SAMPLE_QIF)
        assert result.vendor_format == VendorFormat.QIF_STANDARD

    def test_invalid_xml(self):
        parser = QIFParser()
        result = parser.parse("not xml at all <<<>>>")
        assert len(result.features) == 0


# ===========================================================================
# Calypso Adapter Tests
# ===========================================================================

class TestCalypsoAdapter:

    def test_parse_calypso(self):
        """Parse Calypso XML with 3 features."""
        importer = CMMImporter()
        result = importer.import_string(SAMPLE_CALYPSO, vendor=VendorFormat.CALYPSO)
        assert result.part_number == "SHAFT-019"
        assert result.cmm_model == "ZEISS-ACCURA"
        assert len(result.features) == 3

    def test_calypso_feature_types(self):
        importer = CMMImporter()
        result = importer.import_string(SAMPLE_CALYPSO, vendor=VendorFormat.CALYPSO)
        types = {f.feature_name: f.feature_type for f in result.features}
        assert types["OD1"] == FeatureType.CIRCLE
        assert types["RUNOUT1"] == FeatureType.RUNOUT

    def test_calypso_tolerance(self):
        importer = CMMImporter()
        result = importer.import_string(SAMPLE_CALYPSO, vendor=VendorFormat.CALYPSO)
        runout = next(f for f in result.features if f.feature_name == "RUNOUT1")
        assert runout.status == ToleranceStatus.FAIL
        assert runout.deviation == 0.018

    def test_calypso_pass_count(self):
        importer = CMMImporter()
        result = importer.import_string(SAMPLE_CALYPSO, vendor=VendorFormat.CALYPSO)
        assert result.pass_count == 2
        assert result.fail_count == 1


# ===========================================================================
# Unified Importer Tests
# ===========================================================================

class TestCMMImporter:

    def test_auto_detect_dmis(self):
        importer = CMMImporter()
        result = importer.import_string(SAMPLE_DMIS)
        assert result.vendor_format == VendorFormat.DMIS_STANDARD
        assert len(result.features) == 4

    def test_auto_detect_qif(self):
        importer = CMMImporter()
        result = importer.import_string(SAMPLE_QIF)
        assert result.vendor_format == VendorFormat.QIF_STANDARD
        assert len(result.features) == 4

    def test_auto_detect_calypso(self):
        importer = CMMImporter()
        result = importer.import_string(SAMPLE_CALYPSO)
        # Calypso detected as QIF or Calypso based on <CMMResult>
        assert len(result.features) >= 3

    def test_auto_detect_pcdmis(self):
        importer = CMMImporter()
        result = importer.import_string(SAMPLE_PCDMIS)
        assert result.vendor_format == VendorFormat.PC_DMIS

    def test_explicit_vendor_override(self):
        importer = CMMImporter()
        result = importer.import_string(SAMPLE_DMIS, vendor=VendorFormat.DMIS_STANDARD)
        assert result.vendor_format == VendorFormat.DMIS_STANDARD

    def test_empty_input(self):
        importer = CMMImporter()
        result = importer.import_string("")
        assert result.total_features == 0


# ===========================================================================
# InspectionSchema Tests
# ===========================================================================

class TestInspectionSchema:

    def test_feature_evaluate_tolerance_pass(self):
        feat = InspectionFeature(
            nominal_value=25.0,
            actual_value=25.005,
            deviation=0.005,
            upper_tolerance=0.020,
            lower_tolerance=-0.020,
        )
        status = feat.evaluate_tolerance()
        assert status == ToleranceStatus.PASS

    def test_feature_evaluate_tolerance_fail(self):
        feat = InspectionFeature(
            nominal_value=25.0,
            actual_value=25.030,
            deviation=0.030,
            upper_tolerance=0.020,
            lower_tolerance=-0.020,
        )
        status = feat.evaluate_tolerance()
        assert status == ToleranceStatus.FAIL

    def test_feature_evaluate_tolerance_warning(self):
        """Deviation close to tolerance limit → WARNING."""
        feat = InspectionFeature(
            nominal_value=25.0,
            actual_value=25.019,
            deviation=0.019,
            upper_tolerance=0.020,
            lower_tolerance=-0.020,
        )
        status = feat.evaluate_tolerance()
        assert status == ToleranceStatus.WARNING

    def test_feature_no_tolerance_not_evaluated(self):
        feat = InspectionFeature(nominal_value=25.0, actual_value=25.005)
        status = feat.evaluate_tolerance()
        assert status == ToleranceStatus.NOT_EVALUATED

    def test_inspection_result_to_dict(self):
        result = InspectionResult(
            part_id="P1",
            part_number="TEST-001",
            features=[
                InspectionFeature(
                    feature_name="F1",
                    nominal_value=10.0,
                    actual_value=10.005,
                    status=ToleranceStatus.PASS,
                ),
            ],
        )
        d = result.to_dict()
        assert d["part_number"] == "TEST-001"
        assert d["total_features"] == 1
        assert d["pass_count"] == 1
        assert len(d["features"]) == 1

    def test_surface_finish_result_to_dict(self):
        sf = SurfaceFinishResult(ra=0.80, rz=4.20, rmax=6.50)
        d = sf.to_dict()
        assert d["ra"] == 0.80
        assert d["rz"] == 4.20
        assert d["rmax"] == 6.50

    def test_inspection_session(self):
        session = InspectionSession()
        r1 = InspectionResult(part_id="P1")
        r1.features.append(InspectionFeature(status=ToleranceStatus.PASS))
        r1.features.append(InspectionFeature(status=ToleranceStatus.FAIL))
        session.add_result(r1)

        r2 = InspectionResult(part_id="P2")
        r2.features.append(InspectionFeature(status=ToleranceStatus.PASS))
        r2.features.append(InspectionFeature(status=ToleranceStatus.PASS))
        session.add_result(r2)

        assert session.total_parts_inspected == 2
        assert session.overall_pass_rate == 0.75  # 3 pass, 1 fail

    def test_get_features_by_type(self):
        result = InspectionResult()
        result.features = [
            InspectionFeature(feature_name="C1", feature_type=FeatureType.CIRCLE),
            InspectionFeature(feature_name="P1", feature_type=FeatureType.PLANE),
            InspectionFeature(feature_name="C2", feature_type=FeatureType.CIRCLE),
        ]
        circles = result.get_features_by_type(FeatureType.CIRCLE)
        assert len(circles) == 2

    def test_get_failed_features(self):
        result = InspectionResult()
        result.features = [
            InspectionFeature(feature_name="F1", status=ToleranceStatus.PASS),
            InspectionFeature(feature_name="F2", status=ToleranceStatus.FAIL),
            InspectionFeature(feature_name="F3", status=ToleranceStatus.FAIL),
        ]
        failed = result.get_failed_features()
        assert len(failed) == 2
        assert all(f.status == ToleranceStatus.FAIL for f in failed)

    def test_auto_deviation_calculation(self):
        """Feature auto-calculates deviation from nominal and actual."""
        feat = InspectionFeature(nominal_value=25.0, actual_value=25.012)
        assert abs(feat.deviation - 0.012) < 1e-6

    def test_auto_tolerance_zone(self):
        """Feature auto-calculates tolerance zone from upper/lower."""
        feat = InspectionFeature(
            upper_tolerance=0.020,
            lower_tolerance=-0.010,
        )
        assert abs(feat.tolerance_zone - 0.030) < 1e-6


# ===========================================================================
# Traceability Tests
# ===========================================================================

class TestTraceability:

    def test_dmis_traceability_fields(self):
        parser = DMISParser()
        result = parser.parse(SAMPLE_DMIS)
        assert result.part_number == "BRACKET-001"
        assert result.cmm_model == "CMM-DEA-GLOBAL"
        assert result.operator_id == "OP-SMITH"
        assert result.result_id.startswith("IR-")

    def test_qif_traceability_fields(self):
        parser = QIFParser()
        result = parser.parse(SAMPLE_QIF)
        assert result.part_number == "HOUSING-007"
        assert result.cmm_model == "ZEISS-CONTURA"
        assert result.operator_id == "OP-JONES"

    def test_result_ids_unique(self):
        parser = DMISParser()
        r1 = parser.parse(SAMPLE_DMIS)
        r2 = parser.parse(SAMPLE_DMIS)
        assert r1.result_id != r2.result_id

    def test_feature_ids_unique(self):
        parser = DMISParser()
        result = parser.parse(SAMPLE_DMIS)
        ids = [f.feature_id for f in result.features]
        assert len(ids) == len(set(ids))

    def test_source_file_recorded(self):
        parser = DMISParser()
        result = parser.parse(SAMPLE_DMIS, source_file="test_results.dms")
        assert result.source_file == "test_results.dms"


# ===========================================================================
# Edge Cases
# ===========================================================================

class TestEdgeCases:

    def test_feature_with_zero_deviation(self):
        feat = InspectionFeature(
            nominal_value=10.0,
            actual_value=10.0,
            deviation=0.0,
            upper_tolerance=0.01,
            lower_tolerance=-0.01,
        )
        status = feat.evaluate_tolerance()
        assert status == ToleranceStatus.PASS

    def test_feature_with_negative_deviation(self):
        feat = InspectionFeature(
            deviation=-0.015,
            upper_tolerance=0.020,
            lower_tolerance=-0.020,
            tolerance_zone=0.040,
        )
        status = feat.evaluate_tolerance()
        assert status == ToleranceStatus.PASS

    def test_session_empty_results(self):
        session = InspectionSession()
        assert session.overall_pass_rate == 0.0
        assert session.total_parts_inspected == 0

    def test_session_to_dict(self):
        session = InspectionSession()
        d = session.to_dict()
        assert "session_id" in d
        assert "overall_pass_rate" in d
        assert d["total_parts_inspected"] == 0

    def test_dmis_only_features_no_tolerances(self):
        """DMIS with features but no TOL blocks."""
        content = """\
FEAT/PT1,POINT,CART,10.0,20.0,30.0
MEAS/PT1,CART,10.001,20.002,30.003
ENDMES
"""
        parser = DMISParser()
        result = parser.parse(content)
        assert len(result.features) == 1
        assert result.features[0].status == ToleranceStatus.NOT_EVALUATED
