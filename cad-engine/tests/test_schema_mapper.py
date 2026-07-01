"""Tests for Knowledge Schema Mapping — CC-EXT-MS1-P0-U06."""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.extraction.knowledge_schema import (
    KnowledgeEntry,
    KnowledgeType,
    ValidationStatus,
    ExtractionMethod,
    SourceProvenance,
    KNOWLEDGE_ENTRY_SCHEMA,
    validate_entry_dict,
)
from src.extraction.schema_mapper import (
    SchemaMapper,
    MappingResult,
    map_parameter,
    map_tolerance,
    map_practice,
    map_tool_spec,
    map_cutting_data,
    map_catalog_result,
    reset_id_counter,
    _entry_fingerprint,
    _merge_entries,
)
from src.extraction.param_parser import (
    ExtractedParameter,
    ParameterRange,
    MaterialContext,
    ToolContext,
    ToleranceSpec,
)
from src.extraction.practice_extractor import (
    ExtractedPractice,
    PracticeCategory,
    OperationType,
    PracticeStep,
    ConditionalRule,
    SafetyWarning,
)
from src.extraction.catalog_extractor import (
    CatalogExtractionResult,
    CuttingDataEntry,
    ToolSpecification,
)


@pytest.fixture(autouse=True)
def _reset_ids():
    reset_id_counter()
    yield
    reset_id_counter()


# ---------------------------------------------------------------------------
# KnowledgeEntry and Schema
# ---------------------------------------------------------------------------

class TestKnowledgeEntry:
    def test_default_values(self):
        entry = KnowledgeEntry()
        assert entry.knowledge_type == KnowledgeType.PARAMETER
        assert entry.validation_status == ValidationStatus.PENDING
        assert entry.confidence == 0.5

    def test_to_dict_minimal(self):
        entry = KnowledgeEntry()
        d = entry.to_dict()
        assert d["knowledge_type"] == "parameter"
        assert d["validation_status"] == "pending"
        assert d["confidence"] == 0.5

    def test_to_dict_full(self):
        entry = KnowledgeEntry(
            entry_id="KE-001",
            knowledge_type=KnowledgeType.PARAMETER,
            category="cutting_speed",
            title="Speed for aluminum",
            value={"typical": 300.0},
            material="aluminum",
            material_grade="6061",
            operation="milling",
            tool_type="endmill",
            unit="m/min",
            si_value=300.0,
            min_value=200.0,
            max_value=400.0,
            conditions=["carbide tooling"],
            constraints=[{"type": "max_rpm", "value": "12000"}],
            source=SourceProvenance(
                pdf_path="/test.pdf",
                page_number=5,
                extraction_method="text_parse",
            ),
            validation_status=ValidationStatus.VALID,
            confidence=0.85,
        )
        d = entry.to_dict()
        assert d["entry_id"] == "KE-001"
        assert d["category"] == "cutting_speed"
        assert d["material"] == "aluminum"
        assert d["si_value"] == 300.0
        assert d["min_value"] == 200.0
        assert d["source"]["pdf_path"] == "/test.pdf"

    def test_provenance_truncates_source_text(self):
        prov = SourceProvenance(source_text="x" * 500, confidence=0.9)
        d = prov.to_dict()
        assert len(d["source_text"]) == 200


class TestKnowledgeTypeEnum:
    def test_all_types(self):
        expected = {"parameter", "practice", "tool", "material", "tolerance", "cutting_data"}
        actual = {kt.value for kt in KnowledgeType}
        assert expected == actual


class TestValidationStatusEnum:
    def test_all_statuses(self):
        expected = {"pending", "valid", "suspect", "invalid", "skipped"}
        actual = {vs.value for vs in ValidationStatus}
        assert expected == actual


class TestExtractionMethodEnum:
    def test_all_methods(self):
        expected = {"text_parse", "table_parse", "chart_parse", "iso_parse",
                     "catalog_parse", "practice_parse", "tolerance_parse"}
        actual = {em.value for em in ExtractionMethod}
        assert expected == actual


# ---------------------------------------------------------------------------
# JSON Schema Validation
# ---------------------------------------------------------------------------

class TestSchemaValidation:
    def test_valid_entry_passes(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            confidence=0.8,
            validation_status=ValidationStatus.PENDING,
        )
        errors = validate_entry_dict(entry.to_dict())
        assert len(errors) == 0

    def test_missing_required_field(self):
        errors = validate_entry_dict({"confidence": 0.5})
        assert any("knowledge_type" in e for e in errors)

    def test_invalid_knowledge_type(self):
        errors = validate_entry_dict({
            "knowledge_type": "bogus",
            "confidence": 0.5,
            "validation_status": "pending",
        })
        assert any("knowledge_type" in e for e in errors)

    def test_invalid_validation_status(self):
        errors = validate_entry_dict({
            "knowledge_type": "parameter",
            "confidence": 0.5,
            "validation_status": "bogus",
        })
        assert any("validation_status" in e for e in errors)

    def test_confidence_out_of_range(self):
        errors = validate_entry_dict({
            "knowledge_type": "parameter",
            "confidence": 1.5,
            "validation_status": "pending",
        })
        assert any("confidence" in e for e in errors)

    def test_unknown_field_rejected(self):
        errors = validate_entry_dict({
            "knowledge_type": "parameter",
            "confidence": 0.5,
            "validation_status": "pending",
            "bogus_field": "value",
        })
        assert any("Unknown field" in e for e in errors)

    def test_non_numeric_si_value(self):
        errors = validate_entry_dict({
            "knowledge_type": "parameter",
            "confidence": 0.5,
            "validation_status": "pending",
            "si_value": "not_a_number",
        })
        assert any("si_value" in e for e in errors)


# ---------------------------------------------------------------------------
# Parameter Mapping
# ---------------------------------------------------------------------------

class TestMapParameter:
    def test_basic_mapping(self):
        param = ExtractedParameter(
            param_type="cutting_speed",
            value=ParameterRange(typical=300.0, si_value=300.0, si_unit="m/min"),
            confidence=0.8,
            source_text="Speed: 300 m/min",
        )
        entry = map_parameter(param, pdf_path="/test.pdf", page_number=3)
        assert entry.knowledge_type == KnowledgeType.PARAMETER
        assert entry.category == "cutting_speed"
        assert entry.si_value == 300.0
        assert entry.unit == "m/min"
        assert entry.confidence == 0.8
        assert entry.source.pdf_path == "/test.pdf"
        assert entry.source.page_number == 3

    def test_with_material_context(self):
        param = ExtractedParameter(
            param_type="cutting_speed",
            value=ParameterRange(typical=150.0, si_value=150.0, si_unit="m/min"),
            material_context=MaterialContext(name="steel", grade="4140"),
            confidence=0.7,
        )
        entry = map_parameter(param)
        assert entry.material == "steel"
        assert entry.material_grade == "4140"

    def test_with_tool_context(self):
        param = ExtractedParameter(
            param_type="cutting_speed",
            value=ParameterRange(typical=300.0, si_value=300.0, si_unit="m/min"),
            tool_context=ToolContext(tool_type="endmill"),
            confidence=0.7,
        )
        entry = map_parameter(param)
        assert entry.tool_type == "endmill"

    def test_with_range(self):
        param = ExtractedParameter(
            param_type="feed",
            value=ParameterRange(
                typical=0.2, min_value=0.1, max_value=0.3,
                si_value=0.2, si_unit="mm/rev",
            ),
            confidence=0.7,
        )
        entry = map_parameter(param)
        assert entry.min_value == 0.1
        assert entry.max_value == 0.3

    def test_generates_unique_ids(self):
        param = ExtractedParameter(
            param_type="rpm",
            value=ParameterRange(typical=5000.0, si_value=5000.0, si_unit="rpm"),
            confidence=0.7,
        )
        e1 = map_parameter(param)
        e2 = map_parameter(param)
        assert e1.entry_id != e2.entry_id

    def test_validates_against_schema(self):
        param = ExtractedParameter(
            param_type="cutting_speed",
            value=ParameterRange(typical=300.0, si_value=300.0, si_unit="m/min"),
            confidence=0.8,
        )
        entry = map_parameter(param)
        errors = validate_entry_dict(entry.to_dict())
        assert len(errors) == 0


# ---------------------------------------------------------------------------
# Tolerance Mapping
# ---------------------------------------------------------------------------

class TestMapTolerance:
    def test_symmetric_tolerance(self):
        tol = ToleranceSpec(nominal=10.0, plus=0.05, minus=-0.05, raw_text="10.0 +/- 0.05")
        entry = map_tolerance(tol, pdf_path="/test.pdf")
        assert entry.knowledge_type == KnowledgeType.TOLERANCE
        assert entry.value["nominal"] == 10.0
        assert entry.value["plus"] == 0.05
        assert entry.si_value == 10.0

    def test_fit_class(self):
        tol = ToleranceSpec(fit_class="H7/g6", raw_text="H7/g6 fit")
        entry = map_tolerance(tol)
        assert entry.value["fit_class"] == "H7/g6"


# ---------------------------------------------------------------------------
# Practice Mapping
# ---------------------------------------------------------------------------

class TestMapPractice:
    def test_basic_practice(self):
        practice = ExtractedPractice(
            title="Milling Setup",
            category=PracticeCategory.SETUP,
            operation_type=OperationType.MILLING,
            steps=[PracticeStep(1, "Mount part in vise")],
            confidence=0.7,
            source_text="Milling setup procedure",
        )
        entry = map_practice(practice, pdf_path="/manual.pdf", page_number=10)
        assert entry.knowledge_type == KnowledgeType.PRACTICE
        assert entry.category == "setup"
        assert entry.operation == "milling"
        assert entry.title == "Milling Setup"
        assert len(entry.value["steps"]) == 1

    def test_practice_with_warnings(self):
        practice = ExtractedPractice(
            title="Safety",
            category=PracticeCategory.SAFETY,
            operation_type=OperationType.GENERAL,
            safety_warnings=[SafetyWarning("critical", "Wear PPE", "mandatory_ppe", "goggles")],
            confidence=0.6,
        )
        entry = map_practice(practice)
        assert len(entry.constraints) == 1
        assert entry.constraints[0]["type"] == "mandatory_ppe"

    def test_practice_with_conditions(self):
        practice = ExtractedPractice(
            title="Conditional",
            category=PracticeCategory.STRATEGY,
            operation_type=OperationType.TURNING,
            conditions=[ConditionalRule("titanium", "use coolant")],
            confidence=0.6,
        )
        entry = map_practice(practice)
        assert "titanium" in entry.conditions


# ---------------------------------------------------------------------------
# Tool Spec Mapping
# ---------------------------------------------------------------------------

class TestMapToolSpec:
    def test_basic_tool(self):
        tool = ToolSpecification(
            iso_designation="CNMG120408",
            tool_type="insert",
            grade="carbide",
            coating="TiAlN",
            manufacturer="sandvik",
            confidence=0.8,
        )
        entry = map_tool_spec(tool, manufacturer="sandvik", pdf_path="/catalog.pdf")
        assert entry.knowledge_type == KnowledgeType.TOOL
        assert entry.category == "insert"
        assert entry.title == "CNMG120408"
        assert entry.value["grade"] == "carbide"
        assert entry.value["coating"] == "TiAlN"

    def test_validates_against_schema(self):
        tool = ToolSpecification(part_number="KCAR100", tool_type="endmill")
        entry = map_tool_spec(tool)
        errors = validate_entry_dict(entry.to_dict())
        assert len(errors) == 0


# ---------------------------------------------------------------------------
# Cutting Data Mapping
# ---------------------------------------------------------------------------

class TestMapCuttingData:
    def test_basic_cutting_data(self):
        cd = CuttingDataEntry(
            tool_grade="GC4325",
            workpiece_material="steel",
            speed_min=100.0,
            speed_max=200.0,
            speed_unit="m/min",
            feed_min=0.1,
            feed_max=0.3,
        )
        entry = map_cutting_data(cd, pdf_path="/catalog.pdf")
        assert entry.knowledge_type == KnowledgeType.CUTTING_DATA
        assert entry.material == "steel"
        assert entry.min_value == 100.0
        assert entry.max_value == 200.0
        assert entry.unit == "m/min"


class TestMapCatalogResult:
    def test_maps_entire_catalog(self):
        result = CatalogExtractionResult(
            manufacturer="sandvik",
            catalog_title="Turning Guide",
            tools=[
                ToolSpecification(iso_designation="CNMG120408", tool_type="insert"),
                ToolSpecification(iso_designation="DNMG150608", tool_type="insert"),
            ],
            cutting_data=[
                CuttingDataEntry(workpiece_material="steel", speed_min=100.0, speed_max=200.0),
            ],
        )
        entries = map_catalog_result(result, pdf_path="/catalog.pdf")
        assert len(entries) == 3
        types = {e.knowledge_type for e in entries}
        assert KnowledgeType.TOOL in types
        assert KnowledgeType.CUTTING_DATA in types


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

class TestDeduplication:
    def test_identical_entries_merged(self):
        param1 = ExtractedParameter(
            param_type="cutting_speed",
            value=ParameterRange(typical=300.0, si_value=300.0, si_unit="m/min"),
            material_context=MaterialContext(name="aluminum"),
            confidence=0.7,
        )
        param2 = ExtractedParameter(
            param_type="cutting_speed",
            value=ParameterRange(typical=300.0, si_value=300.0, si_unit="m/min"),
            material_context=MaterialContext(name="aluminum"),
            confidence=0.9,
        )
        mapper = SchemaMapper(pdf_path="/test.pdf", validate=False)
        result = mapper.map_all(parameters=[param1, param2])
        assert len(result.entries) == 1
        assert result.duplicates_merged == 1
        assert result.entries[0].confidence == 0.9  # higher confidence kept

    def test_different_entries_not_merged(self):
        p1 = ExtractedParameter(
            param_type="cutting_speed",
            value=ParameterRange(typical=300.0, si_value=300.0, si_unit="m/min"),
            confidence=0.7,
        )
        p2 = ExtractedParameter(
            param_type="feed",
            value=ParameterRange(typical=0.15, si_value=0.15, si_unit="mm/rev"),
            confidence=0.7,
        )
        mapper = SchemaMapper(validate=False)
        result = mapper.map_all(parameters=[p1, p2])
        assert len(result.entries) == 2
        assert result.duplicates_merged == 0

    def test_merge_preserves_conditions(self):
        e1 = KnowledgeEntry(
            entry_id="A",
            conditions=["carbide tooling"],
            confidence=0.7,
        )
        e2 = KnowledgeEntry(
            entry_id="B",
            conditions=["flood coolant"],
            confidence=0.6,
        )
        _merge_entries(e1, e2)
        assert "carbide tooling" in e1.conditions
        assert "flood coolant" in e1.conditions
        assert "B" in e1.merged_from

    def test_fingerprint_stability(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="cutting_speed",
            material="steel",
            si_value=150.0,
        )
        fp1 = _entry_fingerprint(entry)
        fp2 = _entry_fingerprint(entry)
        assert fp1 == fp2


# ---------------------------------------------------------------------------
# SchemaMapper Integration
# ---------------------------------------------------------------------------

class TestSchemaMapper:
    def test_map_all_mixed_inputs(self):
        params = [ExtractedParameter(
            param_type="cutting_speed",
            value=ParameterRange(typical=300.0, si_value=300.0, si_unit="m/min"),
            confidence=0.8,
        )]
        practices = [ExtractedPractice(
            title="Setup",
            category=PracticeCategory.SETUP,
            operation_type=OperationType.MILLING,
            steps=[PracticeStep(1, "Mount part")],
            confidence=0.7,
        )]
        tolerances = [ToleranceSpec(nominal=10.0, plus=0.05, minus=-0.05, raw_text="10 +/- 0.05")]

        mapper = SchemaMapper(pdf_path="/test.pdf")
        result = mapper.map_all(
            parameters=params,
            practices=practices,
            tolerances=tolerances,
            page_number=5,
        )
        assert len(result.entries) == 3
        types = {e.knowledge_type for e in result.entries}
        assert KnowledgeType.PARAMETER in types
        assert KnowledgeType.PRACTICE in types
        assert KnowledgeType.TOLERANCE in types

    def test_empty_inputs(self):
        mapper = SchemaMapper()
        result = mapper.map_all()
        assert len(result.entries) == 0
        assert result.duplicates_merged == 0

    def test_validation_rejects_bad_entries(self):
        mapper = SchemaMapper(validate=True)
        params = [ExtractedParameter(
            param_type="cutting_speed",
            value=ParameterRange(typical=300.0, si_value=300.0, si_unit="m/min"),
            confidence=0.8,
        )]
        result = mapper.map_all(parameters=params)
        # Valid entries should pass
        assert len(result.entries) >= 1
        assert result.rejected_count == 0

    def test_provenance_tracked(self):
        params = [ExtractedParameter(
            param_type="rpm",
            value=ParameterRange(typical=5000.0, si_value=5000.0, si_unit="rpm"),
            confidence=0.7,
            source_text="Spindle speed: 5000 RPM",
        )]
        mapper = SchemaMapper(pdf_path="/manual.pdf")
        result = mapper.map_all(parameters=params, page_number=12)
        entry = result.entries[0]
        assert entry.source.pdf_path == "/manual.pdf"
        assert entry.source.page_number == 12
        assert entry.source.extraction_method == "text_parse"

    def test_mapping_result_to_dict(self):
        result = MappingResult(
            entries=[KnowledgeEntry()],
            duplicates_merged=2,
            validation_errors=["err1"],
            rejected_count=1,
        )
        d = result.to_dict()
        assert d["entries_count"] == 1
        assert d["duplicates_merged"] == 2
        assert d["validation_errors_count"] == 1
        assert d["rejected_count"] == 1

    def test_catalog_integration(self):
        catalog = CatalogExtractionResult(
            manufacturer="sandvik",
            tools=[ToolSpecification(iso_designation="CNMG120408", tool_type="insert")],
            cutting_data=[CuttingDataEntry(workpiece_material="steel", speed_min=100.0, speed_max=200.0)],
        )
        mapper = SchemaMapper(pdf_path="/catalog.pdf")
        result = mapper.map_all(catalog_result=catalog)
        assert len(result.entries) == 2
