"""Tests for Machining Practice Extraction — CC-EXT-MS1-P0-U04."""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.extraction.practice_extractor import (
    OperationType,
    PracticeCategory,
    PracticeStep,
    ConditionalRule,
    SafetyWarning,
    ExtractedPractice,
    PracticeExtractor,
    detect_operation_type,
    detect_practice_category,
)


class TestOperationTypeDetection:
    def test_milling(self):
        assert detect_operation_type("End mill pocket operation") == OperationType.MILLING

    def test_turning(self):
        assert detect_operation_type("Lathe turning operation facing") == OperationType.TURNING

    def test_drilling(self):
        assert detect_operation_type("Drill pilot holes first") == OperationType.DRILLING

    def test_grinding(self):
        assert detect_operation_type("Surface grind to finish") == OperationType.GRINDING

    def test_edm(self):
        assert detect_operation_type("Wire EDM for tight slots") == OperationType.EDM

    def test_general_fallback(self):
        assert detect_operation_type("General machining text") == OperationType.GENERAL


class TestPracticeCategoryDetection:
    def test_setup(self):
        assert detect_practice_category("Machine setup and zero offset") == PracticeCategory.SETUP

    def test_fixturing(self):
        assert detect_practice_category("Clamp part in vise with fixture") == PracticeCategory.FIXTURING

    def test_strategy(self):
        assert detect_practice_category("Roughing strategy with adaptive clearing") == PracticeCategory.STRATEGY

    def test_coolant(self):
        assert detect_practice_category("Use flood coolant for titanium") == PracticeCategory.COOLANT

    def test_safety(self):
        assert detect_practice_category("Safety warning: wear PPE and check guard") == PracticeCategory.SAFETY

    def test_general_fallback(self):
        assert detect_practice_category("Some general text") == PracticeCategory.GENERAL


class TestPracticeExtractor:
    def test_extracts_numbered_steps(self):
        text = "## Milling Setup\n1. Mount part in vise\n2. Set tool length offset\n3. Touch off Z zero\n4. Run program"
        extractor = PracticeExtractor()
        practices = extractor.extract_practices(text)
        assert len(practices) >= 1
        steps = practices[0].steps
        assert len(steps) >= 3
        assert steps[0].action == "Mount part in vise"

    def test_extracts_conditional_rules(self):
        text = "When machining titanium, use flood coolant. For aluminum, dry cutting is acceptable."
        extractor = PracticeExtractor()
        practices = extractor.extract_practices(text)
        all_conditions = []
        for p in practices:
            all_conditions.extend(p.conditions)
        assert len(all_conditions) >= 1

    def test_extracts_safety_warnings(self):
        text = "## Safety\nNever remove guard during operation. Always wear eye protection."
        extractor = PracticeExtractor()
        practices = extractor.extract_practices(text)
        all_warnings = []
        for p in practices:
            all_warnings.extend(p.safety_warnings)
        assert len(all_warnings) >= 1

    def test_detects_unsafe_practices(self):
        text = "To save time, remove guard and bypass interlock."
        extractor = PracticeExtractor()
        practices = extractor.extract_practices(text)
        critical = []
        for p in practices:
            critical.extend(w for w in p.safety_warnings if w.severity == "critical")
        assert len(critical) >= 1

    def test_detects_max_rpm_constraint(self):
        text = "Maximum RPM: 12000 for this machine."
        extractor = PracticeExtractor()
        practices = extractor.extract_practices(text)
        constraints = []
        for p in practices:
            constraints.extend(w for w in p.safety_warnings if w.constraint_type == "max_rpm")
        assert len(constraints) >= 1
        assert constraints[0].value == "12000"

    def test_links_operation_type(self):
        text = "## End Mill Pocket Strategy\n1. Select appropriate end mill\n2. Set adaptive toolpath"
        extractor = PracticeExtractor()
        practices = extractor.extract_practices(text)
        assert len(practices) >= 1
        assert practices[0].operation_type == OperationType.MILLING

    def test_extracts_applicable_materials(self):
        text = "## Aluminum Roughing\n1. Set speed to 300 m/min for aluminum 6061"
        extractor = PracticeExtractor()
        practices = extractor.extract_practices(text)
        assert len(practices) >= 1
        materials = practices[0].applicable_materials
        assert "aluminum" in materials or "6061" in materials

    def test_confidence_increases_with_detail(self):
        detailed = "## Milling Setup for Steel\n1. Mount part\n2. Set offset\nWhen machining steel, use coolant."
        sparse = "Some general text."
        extractor = PracticeExtractor()
        detailed_p = extractor.extract_practices(detailed)
        sparse_p = extractor.extract_practices(sparse)
        if detailed_p and sparse_p:
            assert detailed_p[0].confidence >= sparse_p[0].confidence

    def test_no_practices_in_generic_text(self):
        text = "This is a general introduction to the document."
        extractor = PracticeExtractor()
        practices = extractor.extract_practices(text)
        # May return a single "General Practice" with no steps/conditions
        for p in practices:
            assert len(p.steps) == 0 or len(p.conditions) == 0

    def test_to_dict_serialization(self):
        practice = ExtractedPractice(
            title="Test Practice",
            category=PracticeCategory.SETUP,
            operation_type=OperationType.MILLING,
            steps=[PracticeStep(1, "Mount part")],
            safety_warnings=[SafetyWarning("warning", "Wear PPE")],
            confidence=0.7,
        )
        d = practice.to_dict()
        assert d["title"] == "Test Practice"
        assert d["category"] == "setup"
        assert d["operation_type"] == "milling"
        assert len(d["steps"]) == 1
        assert len(d["safety_warnings"]) == 1


class TestEnumCompleteness:
    def test_operation_type_members(self):
        expected = {"milling", "turning", "drilling", "grinding", "edm",
                    "boring", "reaming", "tapping", "general"}
        actual = {op.value for op in OperationType}
        assert expected == actual

    def test_practice_category_members(self):
        expected = {"setup", "fixturing", "strategy", "coolant", "safety",
                    "tool_selection", "quality", "general"}
        actual = {pc.value for pc in PracticeCategory}
        assert expected == actual
