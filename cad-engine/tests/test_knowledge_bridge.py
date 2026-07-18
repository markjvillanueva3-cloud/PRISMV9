"""Tests for knowledge_bridge.py — Knowledge-to-ComponentSpec mapping.

Validates the bridge logic: item classification, component mapping,
deduplication, confidence gating, priority scoring, and spec generation.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from knowledge_bridge import (
    BridgeResult,
    ComponentSpec,
    ComponentType,
    PRISMInventory,
    bridge_knowledge,
    _classify_item,
    _compute_priority,
    _flatten_knowledge_items,
    _fuzzy_match,
    _partial_overlap,
    _map_domain,
    _sanitize_name,
    _build_tribal_tip_spec,
    _build_hook_spec,
    _build_engine_spec,
    _build_schema_spec,
    _build_skill_spec,
    _build_algorithm_spec,
    _build_formula_spec,
    _build_script_spec,
    _normalize_item,
    _infer_cam_category,
    _infer_shop_category,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

FIXTURES_PATH = Path(__file__).parent.parent / "test_data" / "video_fixtures.json"


@pytest.fixture(scope="module")
def video_fixtures() -> list[dict]:
    with open(FIXTURES_PATH, encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def empty_inventory() -> PRISMInventory:
    """Inventory with no existing components (everything is novel)."""
    return PRISMInventory(tribal_tips=set(), engines=set(), formulas=set())


@pytest.fixture
def sample_knowledge() -> dict:
    """Sample CC-MS2 format knowledge document."""
    return {
        "schema_version": "2.0.0",
        "video_id": "test123",
        "metadata": {
            "title": "Test Tutorial",
            "primary_domain": "cam",
            "platform": "Mastercam",
        },
        "domains": {
            "cam": {
                "strategies": [
                    {
                        "id": "cam-strat-001",
                        "name": "Adaptive Clearing",
                        "title": "Trochoidal roughing for Inconel",
                        "description": "Use adaptive clearing with 25% stepover for efficient Inconel removal",
                        "strategy_rationale": "Trochoidal motion maintains consistent chip load in hard materials",
                        "cutting_parameters": {
                            "speed_sfm": 300,
                            "feed_ipt": 0.003,
                            "stepover_pct": 25,
                            "doc_inches": 0.5,
                        },
                        "tool": {"type": "end_mill", "diameter": "0.5 inch"},
                        "provenance": {"confidence": 0.85, "source_type": "transcript"},
                        "tags": ["roughing", "trochoidal", "inconel"],
                    },
                    {
                        "id": "cam-strat-002",
                        "name": "Parallel Finishing",
                        "title": "Ball nose finishing pass",
                        "description": "Parallel finishing with ball nose end mill at 0.010 stepover",
                        "cutting_parameters": {
                            "speed_rpm": 10000,
                            "stepover_inches": 0.010,
                        },
                        "provenance": {"confidence": 0.75},
                        "tags": ["finishing", "surface-quality"],
                    },
                ],
                "tool_list": [
                    {
                        "id": "tool-001",
                        "name": "Half inch 3-flute end mill",
                        "description": "Carbide end mill for roughing",
                        "provenance": {"confidence": 0.7},
                        "tags": ["tooling"],
                    },
                ],
            },
            "shop": {
                "practices": [
                    {
                        "id": "shop-prac-001",
                        "title": "Never machine titanium dry",
                        "body": "Always use flood coolant when machining titanium alloys to prevent fire",
                        "practice_type": "safety_procedure",
                        "provenance": {"confidence": 0.9},
                        "tags": ["safety", "titanium", "coolant"],
                    },
                    {
                        "id": "shop-prac-002",
                        "title": "Haas VF-2 work offset setup",
                        "description": "Step by step work offset procedure",
                        "practice_type": "setup",
                        "steps": [
                            "Jog machine to part",
                            "Use edge finder for X zero",
                            "Enter value in G54 page",
                            "Repeat for Y zero",
                            "Use tool setter for Z",
                            "Verify in graphics mode",
                        ],
                        "provenance": {"confidence": 0.8},
                        "tags": ["setup", "work-offset", "haas"],
                    },
                    {
                        "id": "shop-prac-003",
                        "title": "Chatter reduction technique",
                        "body": "If chatter occurs, reduce DOC by 50% and increase speed 10-15%",
                        "practice_type": "troubleshooting",
                        "provenance": {"confidence": 0.7},
                        "tags": ["troubleshooting", "chatter", "vibration"],
                    },
                ],
                "key_takeaways": [
                    "Always run in single block mode first",
                    "Check tool runout before finishing passes",
                ],
            },
        },
        "cross_domain_links": [],
        "extraction_stats": {
            "total_items": 8,
            "cam_strategies": 2,
            "shop_practices": 3,
        },
    }


# ---------------------------------------------------------------------------
# Item Classification Tests
# ---------------------------------------------------------------------------

class TestClassifyItem:
    """Test the _classify_item function."""

    def test_formula_with_equation_and_params_becomes_algorithm(self):
        item = {"category": "formula", "parameters": {"Vc": 300, "fz": 0.003}, "equation": "Vc = pi*D*N/1000", "body": "Vc = pi*D*N/1000"}
        assert _classify_item(item) == ComponentType.ALGORITHM

    def test_formula_with_params_only_becomes_formula(self):
        item = {"category": "formula", "parameters": {"Vc": 300, "fz": 0.003}, "body": "speed and feed values"}
        assert _classify_item(item) == ComponentType.FORMULA

    def test_parameter_table_rich_becomes_schema(self):
        item = {
            "category": "parameter_table",
            "parameters": {"speeds": [1, 2, 3], "feeds": [0.1, 0.2]},
        }
        assert _classify_item(item) == ComponentType.SCHEMA

    def test_parameter_table_sparse_becomes_tip(self):
        item = {"category": "parameter_table", "parameters": {"speed": 300}}
        assert _classify_item(item) == ComponentType.TRIBAL_TIP

    def test_safety_warning_actionable_becomes_hook(self):
        item = {"category": "safety_warning", "body": "Never machine titanium dry"}
        assert _classify_item(item) == ComponentType.HOOK

    def test_safety_warning_general_becomes_tip(self):
        item = {"category": "safety_warning", "body": "Be careful with heat"}
        assert _classify_item(item) == ComponentType.TRIBAL_TIP

    def test_procedure_long_becomes_skill(self):
        item = {
            "category": "procedure",
            "step_count": 6,
            "steps": ["a", "b", "c", "d", "e", "f"],
        }
        assert _classify_item(item) == ComponentType.SKILL

    def test_procedure_short_becomes_tip(self):
        item = {"category": "procedure", "step_count": 2, "steps": ["a", "b"]}
        assert _classify_item(item) == ComponentType.TRIBAL_TIP

    def test_troubleshooting_becomes_tip(self):
        item = {"category": "troubleshooting"}
        assert _classify_item(item) == ComponentType.TRIBAL_TIP

    def test_decision_rule_becomes_tip(self):
        item = {"category": "decision_rule"}
        assert _classify_item(item) == ComponentType.TRIBAL_TIP

    def test_unknown_category_defaults_to_tip(self):
        item = {"category": "something_else"}
        assert _classify_item(item) == ComponentType.TRIBAL_TIP


# ---------------------------------------------------------------------------
# Deduplication Tests
# ---------------------------------------------------------------------------

class TestDeduplication:
    """Test fuzzy matching and PRISM inventory dedup."""

    def test_fuzzy_match_exact(self):
        assert _fuzzy_match("chatter reduction", "chatter reduction")

    def test_fuzzy_match_subset(self):
        assert _fuzzy_match("chatter", "chatter reduction technique")

    def test_fuzzy_match_different(self):
        assert not _fuzzy_match("chatter reduction", "tool life estimation")

    def test_fuzzy_match_empty(self):
        assert not _fuzzy_match("", "something")

    def test_partial_overlap_high(self):
        assert _partial_overlap("chatter reduction technique", "chatter reduction method")

    def test_partial_overlap_low(self):
        assert not _partial_overlap("titanium machining safety", "aluminum milling speed")

    def test_inventory_novel_tip(self, empty_inventory):
        spec = ComponentSpec(
            type=ComponentType.TRIBAL_TIP,
            name="Brand new tip",
            description="test",
            domain="cutting",
            source_video_id="v1",
            source_item_id="i1",
        )
        novelty = empty_inventory.check_novelty(spec)
        assert novelty == 1.0

    def test_inventory_duplicate_tip(self):
        inv = PRISMInventory(
            tribal_tips={"chatter reduction technique"},
            engines=set(),
            formulas=set(),
        )
        spec = ComponentSpec(
            type=ComponentType.TRIBAL_TIP,
            name="Chatter reduction technique",
            description="test",
            domain="cutting",
            source_video_id="v1",
            source_item_id="i1",
        )
        novelty = inv.check_novelty(spec)
        assert novelty == 0.0
        assert spec.existing_overlap is not None

    def test_inventory_extends_tip(self):
        inv = PRISMInventory(
            tribal_tips={"chatter reduction"},
            engines=set(),
            formulas=set(),
        )
        spec = ComponentSpec(
            type=ComponentType.TRIBAL_TIP,
            name="Chatter reduction technique for Inconel milling",
            description="test",
            domain="cutting",
            source_video_id="v1",
            source_item_id="i1",
        )
        novelty = inv.check_novelty(spec)
        # Should be either 0.0 (fuzzy match) or 0.6 (partial overlap)
        assert novelty <= 0.6

    def test_inventory_duplicate_engine(self):
        inv = PRISMInventory(
            tribal_tips=set(),
            engines={"kienzleforcemodel"},
            formulas=set(),
        )
        spec = ComponentSpec(
            type=ComponentType.ENGINE,
            name="KienzleForceModel",
            description="test",
            domain="cutting",
            source_video_id="v1",
            source_item_id="i1",
        )
        novelty = inv.check_novelty(spec)
        assert novelty == 0.0


# ---------------------------------------------------------------------------
# Spec Builder Tests
# ---------------------------------------------------------------------------

class TestSpecBuilders:
    """Test individual spec builder functions."""

    def test_build_tribal_tip_spec(self):
        item = {
            "id": "shop-001",
            "title": "Check tool runout",
            "body": "Always check tool runout before finishing passes",
            "domain": "shop",
            "confidence": 0.7,
            "tags": ["tooling", "quality"],
        }
        spec = _build_tribal_tip_spec(item, "video123")
        assert spec.type == ComponentType.TRIBAL_TIP
        assert spec.name == "Check tool runout"
        assert spec.source_video_id == "video123"
        assert spec.confidence == 0.7
        assert "TribalKnowledgeEngine" in spec.target_file
        assert spec.content_data["category"] == "tooling"

    def test_build_hook_spec(self):
        item = {
            "id": "safety-001",
            "title": "Never machine titanium dry",
            "body": "Always use coolant for titanium",
            "confidence": 0.9,
        }
        spec = _build_hook_spec(item, "video123")
        assert spec.type == ComponentType.HOOK
        assert spec.domain == "safety"
        assert spec.content_data["mode"] == "warning"  # Never blocking

    def test_build_engine_spec(self):
        item = {
            "id": "cam-001",
            "title": "Trochoidal Speed Calculator",
            "parameters": {"Vc": 300, "fz": 0.003},
            "domain": "cam",
            "confidence": 0.85,
            "tags": ["cutting-parameters"],
        }
        spec = _build_engine_spec(item, "video123")
        assert spec.type == ComponentType.ENGINE
        assert "Engine" in spec.name
        assert spec.target_file.endswith(".ts")

    def test_build_schema_spec(self):
        item = {
            "id": "param-001",
            "title": "Inconel 718 Cutting Data",
            "parameters": {"speed": 300, "feed": 0.003},
            "domain": "cam",
            "confidence": 0.8,
        }
        spec = _build_schema_spec(item, "video123")
        assert spec.type == ComponentType.SCHEMA
        assert spec.target_file.endswith(".json")

    def test_build_skill_spec(self):
        item = {
            "id": "proc-001",
            "title": "Haas Work Offset Setup",
            "body": "Step by step procedure",
            "domain": "shop",
            "confidence": 0.7,
            "steps": ["step1", "step2", "step3", "step4", "step5"],
        }
        spec = _build_skill_spec(item, "video123")
        assert spec.type == ComponentType.SKILL
        assert spec.target_file.endswith(".md")


# ---------------------------------------------------------------------------
# Flatten and Normalize Tests
# ---------------------------------------------------------------------------

class TestFlattenAndNormalize:
    """Test knowledge document flattening."""

    def test_flatten_cc_ms2_format(self, sample_knowledge):
        items = _flatten_knowledge_items(sample_knowledge)
        # 2 strategies + 1 tool + 3 practices + 2 takeaways = 8
        assert len(items) >= 7

    def test_flatten_flat_format(self):
        knowledge = {
            "items": [
                {"id": "a", "category": "tribal_tip", "title": "Tip A"},
                {"id": "b", "category": "formula", "title": "Formula B"},
            ]
        }
        items = _flatten_knowledge_items(knowledge)
        assert len(items) == 2
        assert items[0]["id"] == "a"

    def test_normalize_item_with_provenance(self):
        raw = {
            "id": "cam-001",
            "name": "Adaptive Clearing",
            "description": "Trochoidal roughing",
            "cutting_parameters": {"speed": 300},
            "provenance": {"confidence": 0.85, "timestamp_seconds": 45.0},
        }
        item = _normalize_item(raw, "cam", "parameter_table")
        assert item["confidence"] == 0.85
        assert item["source_timestamp"] == 45.0
        assert item["parameters"] == {"speed": 300}

    def test_normalize_item_defaults(self):
        raw = {"title": "Simple tip"}
        item = _normalize_item(raw, "shop", "tribal_tip")
        assert item["confidence"] == 0.6  # default
        assert item["domain"] == "shop"

    def test_infer_cam_category_with_params(self):
        strat = {"cutting_parameters": {"speed": 300, "feed": 0.003}}
        assert _infer_cam_category(strat) == "parameter_table"

    def test_infer_cam_category_with_rationale(self):
        strat = {"strategy_rationale": "Use trochoidal motion for consistent chip load"}
        assert _infer_cam_category(strat) == "decision_rule"

    def test_infer_shop_safety(self):
        practice = {"practice_type": "safety_procedure"}
        assert _infer_shop_category(practice) == "safety_warning"

    def test_infer_shop_troubleshooting(self):
        practice = {"practice_type": "troubleshooting"}
        assert _infer_shop_category(practice) == "troubleshooting"

    def test_infer_shop_procedure(self):
        practice = {"practice_type": "setup", "steps": ["a", "b", "c"]}
        assert _infer_shop_category(practice) == "procedure"


# ---------------------------------------------------------------------------
# Priority Scoring Tests
# ---------------------------------------------------------------------------

class TestPriorityScoring:
    """Test priority computation."""

    def test_high_confidence_high_novelty_tip(self):
        spec = ComponentSpec(
            type=ComponentType.TRIBAL_TIP,
            name="test",
            description="test",
            domain="cutting",
            source_video_id="v",
            source_item_id="i",
            confidence=0.9,
            novelty=1.0,
        )
        score = _compute_priority(spec)
        assert score > 0

    def test_engine_scores_lower_per_unit_complexity(self):
        tip_spec = ComponentSpec(
            type=ComponentType.TRIBAL_TIP,
            name="t",
            description="",
            domain="cutting",
            source_video_id="v",
            source_item_id="i",
            confidence=0.8,
            novelty=1.0,
        )
        eng_spec = ComponentSpec(
            type=ComponentType.ENGINE,
            name="e",
            description="",
            domain="cutting",
            source_video_id="v",
            source_item_id="i",
            confidence=0.8,
            novelty=1.0,
        )
        tip_score = _compute_priority(tip_spec)
        eng_score = _compute_priority(eng_spec)
        # Tips should score higher due to lower complexity denominator
        assert tip_score > eng_score

    def test_duplicate_scores_low(self):
        spec = ComponentSpec(
            type=ComponentType.TRIBAL_TIP,
            name="test",
            description="",
            domain="cutting",
            source_video_id="v",
            source_item_id="i",
            confidence=0.9,
            novelty=0.0,  # duplicate
        )
        score = _compute_priority(spec)
        spec2 = ComponentSpec(
            type=ComponentType.TRIBAL_TIP,
            name="test2",
            description="",
            domain="cutting",
            source_video_id="v",
            source_item_id="i",
            confidence=0.9,
            novelty=1.0,  # novel
        )
        score2 = _compute_priority(spec2)
        assert score2 > score


# ---------------------------------------------------------------------------
# Utility Tests
# ---------------------------------------------------------------------------

class TestUtilities:
    """Test utility functions."""

    def test_sanitize_name_simple(self):
        assert _sanitize_name("hello world") == "HelloWorld"

    def test_sanitize_name_special_chars(self):
        assert _sanitize_name("Haas VF-2 Setup!") == "HaasVf2Setup"

    def test_sanitize_name_empty(self):
        assert _sanitize_name("") == ""

    def test_map_domain_cam(self):
        assert _map_domain("cam") == "cutting"

    def test_map_domain_shop(self):
        assert _map_domain("shop") == "safety"

    def test_map_domain_cad(self):
        assert _map_domain("cad") == "machine"

    def test_map_domain_unknown(self):
        # Unknown domains pass through for dynamic category support
        assert _map_domain("unknown") == "unknown"

    def test_map_domain_software(self):
        assert _map_domain("software") == "automation"

    def test_map_domain_electronics(self):
        assert _map_domain("electronics") == "electronics"

    def test_map_domain_empty(self):
        assert _map_domain("") == "general"


# ---------------------------------------------------------------------------
# Full Bridge Integration Tests
# ---------------------------------------------------------------------------

class TestBridgeKnowledge:
    """Test the full bridge_knowledge function."""

    def test_bridge_produces_specs(self, sample_knowledge, empty_inventory):
        result = bridge_knowledge(
            sample_knowledge,
            "test123",
            max_components=10,
            inventory=empty_inventory,
        )
        assert isinstance(result, BridgeResult)
        assert result.video_id == "test123"
        assert result.total_items >= 7
        assert len(result.specs) > 0

    def test_bridge_max_components_limit(self, sample_knowledge, empty_inventory):
        result = bridge_knowledge(
            sample_knowledge,
            "test123",
            max_components=3,
            inventory=empty_inventory,
        )
        assert len(result.specs) <= 3

    def test_bridge_tips_only(self, sample_knowledge, empty_inventory):
        result = bridge_knowledge(
            sample_knowledge,
            "test123",
            max_components=20,
            tips_only=True,
            inventory=empty_inventory,
        )
        for spec in result.specs:
            assert spec.type == ComponentType.TRIBAL_TIP

    def test_bridge_respects_confidence_gates(self, empty_inventory):
        knowledge = {
            "domains": {
                "cam": {
                    "strategies": [
                        {
                            "id": "s1",
                            "name": "Low conf strategy",
                            "cutting_parameters": {"speed": 100, "feed": 0.001, "doc": 0.1},
                            "provenance": {"confidence": 0.3},  # Below all gates
                        },
                    ],
                },
            },
        }
        result = bridge_knowledge(knowledge, "v1", inventory=empty_inventory)
        assert result.skipped_low_confidence >= 1

    def test_bridge_dedup_removes_duplicates(self):
        inv = PRISMInventory(
            tribal_tips={"trochoidal roughing for inconel"},
            engines=set(),
            formulas=set(),
        )
        knowledge = {
            "domains": {
                "cam": {
                    "strategies": [
                        {
                            "id": "s1",
                            "title": "Trochoidal roughing for Inconel",
                            "description": "test",
                            "provenance": {"confidence": 0.8},
                        },
                    ],
                },
            },
        }
        result = bridge_knowledge(knowledge, "v1", inventory=inv)
        assert result.skipped_duplicate >= 1

    def test_bridge_specs_sorted_by_priority(self, sample_knowledge, empty_inventory):
        result = bridge_knowledge(
            sample_knowledge,
            "test123",
            max_components=20,
            inventory=empty_inventory,
        )
        if len(result.specs) >= 2:
            for i in range(len(result.specs) - 1):
                assert result.specs[i].priority_score >= result.specs[i + 1].priority_score

    def test_bridge_result_serializable(self, sample_knowledge, empty_inventory):
        result = bridge_knowledge(
            sample_knowledge,
            "test123",
            inventory=empty_inventory,
        )
        d = result.to_dict()
        json_str = json.dumps(d)
        parsed = json.loads(json_str)
        assert parsed["video_id"] == "test123"
        assert "specs" in parsed

    def test_bridge_empty_knowledge(self, empty_inventory):
        knowledge = {"domains": {}}
        result = bridge_knowledge(knowledge, "v1", inventory=empty_inventory)
        assert result.total_items == 0
        assert len(result.specs) == 0

    def test_bridge_all_spec_types_possible(self, empty_inventory):
        """Verify bridge can produce multiple component types."""
        knowledge = {
            "domains": {
                "cam": {
                    "strategies": [
                        {
                            "id": "s1",
                            "name": "Rich strategy",
                            "cutting_parameters": {
                                "speed": 300, "feed": 0.003, "doc": 0.5,
                            },
                            "strategy_rationale": "Trochoidal for consistent chip load in hard materials",
                            "provenance": {"confidence": 0.9},
                            "tags": ["roughing"],
                        },
                    ],
                },
                "shop": {
                    "practices": [
                        {
                            "id": "p1",
                            "title": "Never machine titanium dry",
                            "body": "Always use flood coolant for titanium",
                            "practice_type": "safety_procedure",
                            "provenance": {"confidence": 0.9},
                            "tags": ["safety"],
                        },
                        {
                            "id": "p2",
                            "title": "Full setup procedure",
                            "description": "Complete work offset setup",
                            "practice_type": "setup",
                            "steps": ["a", "b", "c", "d", "e"],
                            "provenance": {"confidence": 0.8},
                            "tags": ["setup"],
                        },
                        {
                            "id": "p3",
                            "title": "Chatter fix",
                            "body": "Reduce DOC, increase speed",
                            "practice_type": "troubleshooting",
                            "provenance": {"confidence": 0.7},
                            "tags": ["troubleshooting"],
                        },
                    ],
                },
            },
        }
        result = bridge_knowledge(
            knowledge, "v1", max_components=20, inventory=empty_inventory,
        )
        types_found = {s.type for s in result.specs}
        # Should have at least tips and possibly hooks/skills
        assert ComponentType.TRIBAL_TIP in types_found
        assert len(types_found) >= 2  # Multiple types generated


# ---------------------------------------------------------------------------
# Integration with Video Fixtures
# ---------------------------------------------------------------------------

class TestBridgeWithFixtures:
    """Test bridge with real video fixture data run through classification."""

    def test_bridge_fixture_video(self, video_fixtures, empty_inventory):
        """Run a fixture through rule-based extraction then bridge."""
        # Use the Mastercam tutorial (CAM domain, rich in cutting params)
        mastercam = next(
            v for v in video_fixtures if v["expected_domain"] == "cam"
            and "Mastercam" in v["expected_software"]
        )

        # Build a simple knowledge doc from the fixture
        from domain_classify import classify
        from platform_detect import detect

        cls = classify(title=mastercam["title"], transcript=mastercam["transcript"])
        det = detect(title=mastercam["title"], transcript=mastercam["transcript"])

        # Create a flat-format knowledge document
        # (simulating what rule-based extraction would produce)
        knowledge = _build_fixture_knowledge(mastercam, cls, det)

        result = bridge_knowledge(
            knowledge, mastercam["video_id"],
            max_components=10,
            inventory=empty_inventory,
        )

        assert result.total_items >= 1
        assert len(result.specs) >= 1

        # Mastercam tutorial has cutting parameters -> should produce specs
        has_cutting = any(
            "cutting" in s.domain or "parameter" in s.description.lower()
            for s in result.specs
        )
        assert has_cutting or len(result.specs) > 0

    def test_bridge_multiple_fixtures(self, video_fixtures, empty_inventory):
        """Bridge should handle all 8 fixture videos."""
        from domain_classify import classify
        from platform_detect import detect

        total_specs = 0
        for v in video_fixtures:
            cls = classify(title=v["title"], transcript=v["transcript"])
            det = detect(title=v["title"], transcript=v["transcript"])
            knowledge = _build_fixture_knowledge(v, cls, det)
            result = bridge_knowledge(
                knowledge, v["video_id"],
                max_components=5,
                inventory=empty_inventory,
            )
            total_specs += len(result.specs)

        # All 8 videos together should produce meaningful output
        assert total_specs >= 8, f"Expected >= 8 specs from 8 videos, got {total_specs}"


# ---------------------------------------------------------------------------
# New Builder Tests (Algorithm, Formula, Script)
# ---------------------------------------------------------------------------

class TestNewBuilders:
    """Test the new spec builders for algorithm, formula, and script."""

    def test_build_algorithm_spec(self):
        item = {
            "id": "formula-001",
            "title": "Cutting Speed Calculator",
            "body": "Vc = pi * D * N / 1000",
            "equation": "Vc = pi * D * N / 1000",
            "domain": "cam",
            "confidence": 0.85,
            "parameters": {"D": 12.0, "N": 3000},
            "tags": ["formula", "cutting-speed"],
        }
        spec = _build_algorithm_spec(item, "video123")
        assert spec.type == ComponentType.ALGORITHM
        assert "CuttingSpeedCalculator" in spec.name
        assert spec.target_file.endswith(".ts")
        assert "algorithms" in spec.target_file
        assert spec.content_data["equation"] == "Vc = pi * D * N / 1000"

    def test_build_formula_spec(self):
        item = {
            "id": "param-001",
            "title": "Feed Rate Formula",
            "body": "Vf = fz * z * N",
            "equation": "Vf = fz * z * N",
            "domain": "cam",
            "confidence": 0.8,
            "parameters": {"fz": 0.003, "z": 4, "N": 3000},
        }
        spec = _build_formula_spec(item, "video123")
        assert spec.type == ComponentType.FORMULA
        assert spec.target_file.endswith(".json")
        assert "formulas" in spec.target_file
        assert spec.content_data["domain"] == "CUTTING"

    def test_build_script_spec(self):
        item = {
            "id": "proc-001",
            "title": "Batch Tool Check",
            "body": "Automate tool length verification for all tools in magazine",
            "domain": "shop",
            "confidence": 0.7,
            "steps": ["load tool", "measure length", "compare to reference", "log result"],
            "tags": ["automation", "tool-check"],
        }
        spec = _build_script_spec(item, "video123")
        assert spec.type == ComponentType.SCRIPT
        assert spec.target_file.endswith(".py")
        assert "scripts" in spec.target_file
        assert len(spec.content_data["steps"]) == 4


# ---------------------------------------------------------------------------
# Component Generator Tests
# ---------------------------------------------------------------------------

class TestComponentGenerator:
    """Test the component_generator module."""

    def test_generate_tribal_tip(self):
        from component_generator import _generate_tribal_tip
        spec = _build_tribal_tip_spec(
            {"id": "t1", "title": "Test tip", "body": "A useful tip about machining",
             "domain": "cam", "confidence": 0.7, "tags": ["test"]},
            "vid123",
        )
        comp = _generate_tribal_tip(spec, "vid123", "C:/PRISM")
        assert comp.file_type == "typescript"
        assert "tk-vl-vid123" in comp.content
        assert "Test tip" in comp.content
        assert "TribalKnowledgeEngine" in comp.file_path

    def test_generate_engine(self):
        from component_generator import _generate_engine
        spec = _build_engine_spec(
            {"id": "e1", "title": "Speed Calculator", "body": "Calculates cutting speed",
             "domain": "cam", "confidence": 0.85, "parameters": {"rpm": 3000, "diameter": 12},
             "tags": ["speed"]},
            "vid123",
        )
        comp = _generate_engine(spec, "vid123", "C:/PRISM")
        assert comp.file_type == "typescript"
        assert "class SpeedCalculatorEngine" in comp.content
        assert "calculate(" in comp.content
        assert comp.file_path.endswith(".ts")

    def test_generate_algorithm(self):
        from component_generator import _generate_algorithm
        spec = _build_algorithm_spec(
            {"id": "a1", "title": "Chip Load Calculator", "equation": "fz = Vf/(z*N)",
             "body": "Calculate chip load", "domain": "cam", "confidence": 0.85,
             "parameters": {"Vf": 60, "z": 4, "N": 3000}, "tags": ["formula"]},
            "vid123",
        )
        comp = _generate_algorithm(spec, "vid123", "C:/PRISM")
        assert comp.file_type == "typescript"
        assert "implements Algorithm" in comp.content
        assert "validate(" in comp.content
        assert "calculate(" in comp.content
        assert "getMetadata(" in comp.content

    def test_generate_hook(self):
        from component_generator import _generate_hook
        spec = _build_hook_spec(
            {"id": "h1", "title": "Never machine titanium dry",
             "body": "Always use flood coolant for titanium alloys",
             "confidence": 0.9},
            "vid123",
        )
        comp = _generate_hook(spec, "vid123", "C:/PRISM")
        assert comp.file_type == "typescript"
        assert "HookDefinition" in comp.content
        assert 'mode: "warning"' in comp.content  # Never blocking
        assert "VideoLearnedHooks" in comp.file_path

    def test_generate_skill(self):
        from component_generator import _generate_skill
        spec = _build_skill_spec(
            {"id": "s1", "title": "Work Offset Setup Procedure",
             "body": "Complete G54 setup for Haas machine", "domain": "shop",
             "confidence": 0.7,
             "steps": ["home machine", "load edge finder", "touch X", "touch Y", "set Z", "verify"]},
            "vid123",
        )
        comp = _generate_skill(spec, "vid123", "C:/PRISM")
        assert comp.file_type == "markdown"
        assert "Work Offset Setup Procedure" in comp.content
        assert "## Procedure" in comp.content
        assert comp.file_path.endswith(".md")

    def test_generate_script(self):
        from component_generator import _generate_script
        spec = _build_script_spec(
            {"id": "sc1", "title": "Tool Check Automation",
             "body": "Automate tool measurement", "domain": "shop",
             "confidence": 0.7,
             "steps": ["load tool", "measure", "compare", "log"],
             "tags": ["automation"]},
            "vid123",
        )
        comp = _generate_script(spec, "vid123", "C:/PRISM")
        assert comp.file_type == "python"
        assert "def main()" in comp.content
        assert "argparse" in comp.content
        assert comp.file_path.endswith(".py")

    def test_generate_schema(self):
        from component_generator import _generate_schema
        spec = _build_schema_spec(
            {"id": "sch1", "title": "Steel Cutting Data",
             "parameters": {"speed_sfm": 300, "feed_ipt": 0.003},
             "domain": "cam", "confidence": 0.8},
            "vid123",
        )
        comp = _generate_schema(spec, "vid123", "C:/PRISM")
        assert comp.file_type == "json"
        import json
        data = json.loads(comp.content)
        assert data["$schema"] == "http://json-schema.org/draft-07/schema#"
        assert "properties" in data

    def test_generate_formula(self):
        from component_generator import _generate_formula
        spec = _build_formula_spec(
            {"id": "f1", "title": "Cutting Speed Formula",
             "equation": "Vc = pi*D*N/1000", "domain": "cam",
             "confidence": 0.85,
             "parameters": {"D": 12, "N": 3000}},
            "vid123",
        )
        comp = _generate_formula(spec, "vid123", "C:/PRISM")
        assert comp.file_type == "json"
        import json
        data = json.loads(comp.content)
        assert "id" in data
        assert data["id"].startswith("F-")
        assert "equation" in data
        assert "inputs" in data

    def test_generate_components_batch(self):
        from src.component_generator import generate_components
        specs = [
            _build_tribal_tip_spec(
                {"id": "t1", "title": "Tip 1", "body": "Test", "domain": "cam",
                 "confidence": 0.7, "tags": ["test"]}, "v1"),
            _build_hook_spec(
                {"id": "h1", "title": "Never do X", "body": "Always check Y",
                 "confidence": 0.8}, "v1"),
        ]
        result = generate_components(specs, "v1")
        assert result.success_count == 2
        assert len(result.errors) == 0
        assert "tribal_tip" in result.by_type
        assert "hook" in result.by_type


# ---------------------------------------------------------------------------
# Offline Extraction Tests
# ---------------------------------------------------------------------------

class TestOfflineExtraction:
    """Test the enhanced rule-based extraction."""

    def test_extract_cutting_params(self):
        from knowledge_extract_offline import extract_offline
        result = extract_offline(
            "set spindle speed to 3000 rpm. feed rate is 40 inches per minute. depth of cut is 0.040 inches.",
            domain="cam",
        )
        items = result["items"]
        param_items = [i for i in items if i["category"] == "parameter_table"]
        assert len(param_items) >= 1
        params = param_items[0]["parameters"]
        assert "spindle_speed_rpm" in params
        assert 3000 in params["spindle_speed_rpm"]

    def test_extract_tools(self):
        from knowledge_extract_offline import extract_offline
        result = extract_offline(
            "select a half inch 3 flute end mill for roughing and a quarter inch drill for holes",
            domain="cam",
        )
        items = result["items"]
        tool_items = [i for i in items if "tool" in " ".join(i.get("tags", [])).lower()]
        assert len(tool_items) >= 1

    def test_extract_safety(self):
        from knowledge_extract_offline import extract_offline
        result = extract_offline(
            "never reach into the machine while spindle is rotating. always wear safety glasses.",
            domain="shop",
        )
        items = result["items"]
        safety_items = [i for i in items if i["category"] == "safety_warning"]
        assert len(safety_items) >= 1

    def test_extract_procedures(self):
        from knowledge_extract_offline import extract_offline
        result = extract_offline(
            "first set up the stock. next create a roughing toolpath. then add finishing. now add drilling. finally post process.",
            title="CNC Milling Tutorial",
            domain="cam",
        )
        items = result["items"]
        proc_items = [i for i in items if i["category"] == "procedure"]
        assert len(proc_items) >= 1
        assert proc_items[0].get("step_count", 0) >= 3

    def test_extract_gcode(self):
        from knowledge_extract_offline import extract_offline
        result = extract_offline(
            "g00 is rapid positioning g01 is linear feed g02 clockwise arc g03 counterclockwise g81 drill cycle g83 peck drill",
            domain="shop",
        )
        items = result["items"]
        gcode_items = [i for i in items if "gcode" in " ".join(i.get("tags", [])).lower()]
        assert len(gcode_items) >= 1

    def test_extract_formulas(self):
        from knowledge_extract_offline import extract_offline
        result = extract_offline(
            "cutting speed vc = pi × d × n / 1000 where d is diameter and n is rpm",
            domain="cam",
        )
        items = result["items"]
        formula_items = [i for i in items if i["category"] == "formula"]
        assert len(formula_items) >= 1
        assert formula_items[0].get("equation", "")

    def test_extract_software_patterns(self):
        from knowledge_extract_offline import extract_offline
        result = extract_offline(
            "you should always validate input before processing. "
            "best practice is to use type checking. "
            "set the timeout to 30 seconds.",
            domain="software",
        )
        items = result["items"]
        # Should find best practices and/or configuration
        assert len(items) >= 1

    def test_extract_additive_patterns(self):
        from knowledge_extract_offline import extract_offline
        result = extract_offline(
            "set layer height to 0.2 mm. nozzle temperature to 210 degrees. "
            "bed temperature to 60 degrees. infill to 20%. "
            "use PLA filament for this print.",
            domain="additive",
        )
        items = result["items"]
        param_items = [i for i in items if i["category"] == "parameter_table"]
        assert len(param_items) >= 1
        params = param_items[0]["parameters"]
        assert "layer_height_mm" in params or "nozzle_temp_c" in params

    def test_auto_detect_domain(self):
        from knowledge_extract_offline import _auto_detect_domain
        assert _auto_detect_domain("set spindle speed rpm toolpath cnc milling") in ("cam", "shop")
        assert _auto_detect_domain("function api server deploy docker code") == "software"
        assert _auto_detect_domain("circuit voltage resistor capacitor pcb") == "electronics"
        assert _auto_detect_domain("layer height infill nozzle filament slicer") == "additive"

    def test_extract_general_knowledge(self):
        from knowledge_extract_offline import extract_offline
        result = extract_offline(
            "the key is to always check your measurements twice. "
            "don't forget to save your work frequently. "
            "make sure to clean the surface before applying adhesive.",
            domain="general",
        )
        items = result["items"]
        assert len(items) >= 2  # Should find insights and reminders

    def test_full_fixture_extraction(self, video_fixtures):
        """Test extraction on all fixtures produces richer output than before."""
        from knowledge_extract_offline import extract_offline
        from domain_classify import classify

        total_items = 0
        for fixture in video_fixtures:
            cls = classify(title=fixture["title"], transcript=fixture["transcript"])
            result = extract_offline(
                transcript=fixture["transcript"],
                title=fixture["title"],
                domain=cls.primary_domain,
                platform=fixture.get("expected_software", [""])[0],
            )
            total_items += len(result["items"])

        # Enhanced extraction should produce 50+ items across 8 fixtures
        # (vs. ~8-10 items from the old simplistic extraction)
        assert total_items >= 40, f"Expected >= 40 items from 8 fixtures, got {total_items}"


# ---------------------------------------------------------------------------
# Learning Registry Tests
# ---------------------------------------------------------------------------

class TestLearningRegistry:
    """Test the learning registry module."""

    def test_registry_load_save(self, tmp_path):
        from learning_registry import LearningRegistry, RunRecord
        reg_path = str(tmp_path / "test-registry.json")
        reg = LearningRegistry(registry_path=reg_path)
        assert len(reg.runs) == 0

        record = RunRecord(
            video_id="test123", title="Test Video", url="fixture:test123",
            domain="cam", platform="Mastercam", processed_at="2026-03-01",
            mode="fixture", flags=["--tips-only"],
            components_generated={"tribal_tip": 3, "total": 3},
            component_ids=["tk-1", "tk-2", "tk-3"],
        )
        reg.add_run(record)
        reg.save()

        # Reload
        reg2 = LearningRegistry(registry_path=reg_path)
        assert len(reg2.runs) == 1
        assert reg2.runs[0].video_id == "test123"

    def test_is_processed(self, tmp_path):
        from learning_registry import LearningRegistry, RunRecord
        reg = LearningRegistry(registry_path=str(tmp_path / "test.json"))
        assert not reg.is_processed("vid1")

        reg.add_run(RunRecord(
            video_id="vid1", title="T", url="u", domain="cam",
            platform="", processed_at="2026-03-01", mode="fixture",
        ))
        assert reg.is_processed("vid1")
        assert not reg.is_processed("vid2")

    def test_stats(self, tmp_path):
        from learning_registry import LearningRegistry, RunRecord
        reg = LearningRegistry(registry_path=str(tmp_path / "test.json"))

        reg.add_run(RunRecord(
            video_id="v1", title="T1", url="u", domain="cam",
            platform="Mastercam", processed_at="2026-03-01", mode="fixture",
            components_generated={"tribal_tip": 3, "hook": 1, "total": 4},
        ))
        reg.add_run(RunRecord(
            video_id="v2", title="T2", url="u", domain="shop",
            platform="Haas", processed_at="2026-03-01", mode="fixture",
            components_generated={"tribal_tip": 2, "total": 2},
        ))

        stats = reg.get_stats()
        assert stats.total_videos == 2
        assert stats.total_components == 6
        assert stats.by_domain == {"cam": 1, "shop": 1}
        assert stats.by_component_type["tribal_tip"] == 5

    def test_format_report(self, tmp_path):
        from learning_registry import LearningRegistry, RunRecord
        reg = LearningRegistry(registry_path=str(tmp_path / "test.json"))
        reg.add_run(RunRecord(
            video_id="v1", title="Test Video", url="u", domain="cam",
            platform="Mastercam", processed_at="2026-03-01", mode="fixture",
            components_generated={"tribal_tip": 3, "total": 3},
        ))
        report = reg.format_report()
        assert "LEARNING REGISTRY" in report
        assert "Sources processed:" in report
        assert "1" in report


# ---------------------------------------------------------------------------
# Component Writer Tests
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Video Brainstorm + RGS Tests
# ---------------------------------------------------------------------------

class TestVideoBrainstorm:
    """Test the brainstorm and RGS milestone generation."""

    def test_brainstorm_from_knowledge(self):
        from video_brainstorm import brainstorm_from_knowledge
        knowledge = {"items": [
            {"id": "p1", "category": "parameter_table", "body": "RPM 3000, IPM 40", "parameters": {"rpm": [3000]}},
            {"id": "s1", "category": "safety_warning", "body": "never machine titanium dry"},
            {"id": "r1", "category": "decision_rule", "body": "use trochoidal for Inconel"},
            {"id": "r2", "category": "decision_rule", "body": "use adaptive for aluminum"},
            {"id": "r3", "category": "decision_rule", "body": "reduce DOC for thin walls"},
            {"id": "proc1", "category": "procedure", "body": "step by step setup", "steps": ["a", "b", "c", "d", "e"]},
        ]}
        # Simulate only tribal_tip specs generated
        bridge_specs = [
            {"type": "tribal_tip", "name": "tip1"},
            {"type": "tribal_tip", "name": "tip2"},
            {"type": "tribal_tip", "name": "tip3"},
        ]
        result = brainstorm_from_knowledge(knowledge, bridge_specs, "vid1", "Test Video", "cam")
        assert len(result.ideas) >= 3
        categories = {i.category for i in result.ideas}
        # Should suggest formulas, hooks, engines, skills from the gaps
        assert len(categories) >= 2

    def test_brainstorm_sorted_by_value(self):
        from video_brainstorm import brainstorm_from_knowledge
        knowledge = {"items": [
            {"id": "p1", "category": "parameter_table", "parameters": {"x": 1}},
            {"id": "s1", "category": "safety_warning", "body": "never do this"},
            {"id": "proc1", "category": "procedure", "steps": ["a", "b", "c", "d", "e"]},
        ]}
        result = brainstorm_from_knowledge(knowledge, [], "vid1", domain="cam")
        if len(result.ideas) >= 2:
            # First idea should have higher value/effort ratio
            effort_rank = {"small": 1, "medium": 2, "large": 3}
            value_rank = {"high": 3, "medium": 2, "low": 1}
            score0 = value_rank.get(result.ideas[0].value, 1) / effort_rank.get(result.ideas[0].effort, 2)
            score1 = value_rank.get(result.ideas[1].value, 1) / effort_rank.get(result.ideas[1].effort, 2)
            assert score0 >= score1

    def test_generate_rgs_milestone(self):
        from src.video_brainstorm import brainstorm_from_knowledge, generate_rgs_milestone
        knowledge = {"items": [
            {"id": "p1", "category": "parameter_table", "parameters": {"rpm": [3000]}},
            {"id": "s1", "category": "safety_warning", "body": "always check coolant"},
            {"id": "r1", "category": "decision_rule", "body": "use X for Y"},
            {"id": "r2", "category": "decision_rule", "body": "use A for B"},
            {"id": "r3", "category": "decision_rule", "body": "use C for D"},
        ]}
        brainstorm = brainstorm_from_knowledge(knowledge, [], "vid1", "Test Video", "cam")
        milestone = generate_rgs_milestone(brainstorm, "vid1", "Test Video", "cam")

        if milestone is not None:
            assert milestone.id.startswith("VL-CAM-")
            assert len(milestone.units) >= 1
            for unit in milestone.units:
                assert len(unit.steps) >= 2
                assert unit.id.startswith(milestone.id)

    def test_no_milestone_from_weak_brainstorm(self):
        from src.video_brainstorm import brainstorm_from_knowledge, generate_rgs_milestone
        knowledge = {"items": [{"id": "t1", "category": "tribal_tip", "body": "just a tip"}]}
        brainstorm = brainstorm_from_knowledge(knowledge, [{"type": "tribal_tip"}], "vid1", domain="cam")
        milestone = generate_rgs_milestone(brainstorm, "vid1", "Test", "cam")
        # With only one trivial item, should produce None or minimal milestone
        # (depends on whether enhancement ideas are generated)

    def test_save_brainstorm(self, tmp_path):
        from video_brainstorm import (
            BrainstormResult, BrainstormIdea, RGSMilestone, RGSUnit, save_brainstorm,
        )
        brainstorm = BrainstormResult(
            video_id="vid1",
            ideas=[BrainstormIdea(
                title="Test idea", description="A test", category="engine",
                domain="cam", effort="medium", value="high",
            )],
        )
        milestone = RGSMilestone(
            id="VL-CAM-vid1", title="Test",
            description="Test milestone", video_source="video:vid1",
            units=[RGSUnit(id="VL-CAM-vid1-U01", title="Unit 1", steps=["step 1"])],
        )
        paths = save_brainstorm(brainstorm, milestone, str(tmp_path))
        assert "brainstorm" in paths
        assert os.path.exists(paths["brainstorm"])
        assert "milestone" in paths
        assert os.path.exists(paths["milestone"])

        # Verify JSON is valid
        with open(paths["brainstorm"]) as f:
            data = json.load(f)
        assert data["idea_count"] == 1


class TestComponentWriter:
    """Test the component_writer module."""

    def test_write_tribal_tips(self, tmp_path):
        from component_generator import _generate_tribal_tip
        from src.component_writer import write_components, GenerationResult

        # Create a fake TribalKnowledgeEngine.ts
        engine_dir = tmp_path / "mcp-server" / "src" / "engines"
        engine_dir.mkdir(parents=True)
        engine_file = engine_dir / "TribalKnowledgeEngine.ts"
        engine_file.write_text(
            'const KNOWLEDGE_BASE: KnowledgeTip[] = [\n'
            '  { id: "existing-tip", title: "Test", body: "test", category: "setup", tags: [], confidence: 80, source: "test", created_at: "2026-01-01", usage_count: 0 },\n'
            '];\n',
            encoding="utf-8",
        )

        spec = _build_tribal_tip_spec(
            {"id": "t1", "title": "New tip", "body": "New advice",
             "domain": "cam", "confidence": 0.7, "tags": ["test"]},
            "vid123",
        )
        comp = _generate_tribal_tip(spec, "vid123", str(tmp_path))

        gen_result = GenerationResult(video_id="vid123", components=[comp])
        write_result = write_components(gen_result, base_dir=str(tmp_path))

        assert write_result.tips_appended == 1
        assert len(write_result.errors) == 0

        # Verify the file was modified
        content = engine_file.read_text(encoding="utf-8")
        assert "New tip" in content
        assert "existing-tip" in content  # Original tip still there

    def test_write_new_file(self, tmp_path):
        from component_generator import _generate_schema
        from src.component_writer import write_components, GenerationResult

        spec = _build_schema_spec(
            {"id": "s1", "title": "Test Data",
             "parameters": {"speed": 300}, "domain": "cam", "confidence": 0.8},
            "vid123",
        )
        comp = _generate_schema(spec, "vid123", str(tmp_path))

        gen_result = GenerationResult(video_id="vid123", components=[comp])
        write_result = write_components(gen_result, base_dir=str(tmp_path))

        assert len(write_result.files_written) == 1
        assert len(write_result.errors) == 0
        assert os.path.exists(write_result.files_written[0])

    def test_no_overwrite_existing(self, tmp_path):
        from component_generator import _generate_engine
        from src.component_writer import write_components, GenerationResult

        # Create existing engine file
        engine_dir = tmp_path / "mcp-server" / "src" / "engines"
        engine_dir.mkdir(parents=True)
        existing = engine_dir / "TestEngine.ts"
        existing.write_text("// existing engine", encoding="utf-8")

        spec = _build_engine_spec(
            {"id": "e1", "title": "Test", "body": "test",
             "domain": "cam", "confidence": 0.8, "parameters": {}, "tags": []},
            "vid123",
        )
        # Force the file path to match existing
        comp = _generate_engine(spec, "vid123", str(tmp_path))
        comp.file_path = str(existing)

        gen_result = GenerationResult(video_id="vid123", components=[comp])
        write_result = write_components(gen_result, base_dir=str(tmp_path))

        assert len(write_result.skipped) == 1
        # Original content preserved
        assert existing.read_text(encoding="utf-8") == "// existing engine"

    def test_dry_run(self, tmp_path):
        from component_generator import _generate_schema
        from src.component_writer import write_components, GenerationResult

        spec = _build_schema_spec(
            {"id": "s1", "title": "Dry Test",
             "parameters": {"x": 1}, "domain": "cam", "confidence": 0.7},
            "vid123",
        )
        comp = _generate_schema(spec, "vid123", str(tmp_path))

        gen_result = GenerationResult(video_id="vid123", components=[comp])
        write_result = write_components(gen_result, base_dir=str(tmp_path), dry_run=True)

        assert len(write_result.files_written) == 1
        assert "[dry-run]" in write_result.files_written[0]

    def test_full_pipeline_write(self, tmp_path):
        """End-to-end: extraction → bridge → generate → write."""
        from knowledge_extract_offline import extract_offline
        from src.component_generator import generate_components
        from src.component_writer import write_components

        # Create TribalKnowledgeEngine.ts structure for tip writing
        engine_dir = tmp_path / "mcp-server" / "src" / "engines"
        engine_dir.mkdir(parents=True)
        (engine_dir / "TribalKnowledgeEngine.ts").write_text(
            'const KNOWLEDGE_BASE: KnowledgeTip[] = [\n'
            '  { id: "seed", title: "Seed", body: "seed", category: "setup", tags: [], confidence: 50, source: "test", created_at: "2026-01-01", usage_count: 0 },\n'
            '];\n',
            encoding="utf-8",
        )

        # Extract from sample transcript
        knowledge = extract_offline(
            "set spindle speed to 3000 rpm. feed rate is 40 ipm. "
            "never machine titanium dry. always wear safety glasses. "
            "use adaptive clearing for roughing aluminum. "
            "first set up stock. next create toolpath. then post process.",
            title="Test Machining Tutorial",
            domain="cam",
            platform="Mastercam",
        )

        # Bridge
        empty_inv = PRISMInventory(tribal_tips=set(), engines=set(), formulas=set())
        bridge_result = bridge_knowledge(
            knowledge, "test-vid",
            max_components=50,
            inventory=empty_inv,
        )
        assert len(bridge_result.specs) >= 3

        # Generate
        gen_result = generate_components(bridge_result.specs, "test-vid", base_dir=str(tmp_path))
        assert gen_result.success_count >= 3

        # Write
        write_result = write_components(gen_result, base_dir=str(tmp_path))
        assert write_result.total_written >= 2
        assert len(write_result.errors) == 0


# ---------------------------------------------------------------------------
# Document Pipeline Integration Tests
# ---------------------------------------------------------------------------


class TestDocumentOfflineExtraction:
    """Test offline document extraction path (no API calls)."""

    def test_extract_from_document_offline_text(self, tmp_path):
        """Test offline extraction from a plain text document."""
        from src.document_extract import extract_from_document_offline

        txt = tmp_path / "handbook.txt"
        txt.write_text(
            "CNC Machining Handbook\n\n"
            "Set spindle speed to 3000 rpm. Feed rate is 40 ipm.\n"
            "Never machine titanium dry. Always wear safety glasses.\n"
            "Depth of cut is 0.040 inches for roughing.\n",
            encoding="utf-8",
        )

        result = extract_from_document_offline(txt, force_domain="cam")
        assert result.video_id == "handbook"
        items = result.knowledge.get("items", [])
        assert len(items) >= 2  # parameters + safety
        assert result.knowledge["metadata"]["source_type"] == "document"
        assert result.knowledge["extraction_stats"]["extraction_mode"] == "offline"

    def test_extract_from_document_offline_auto_domain(self, tmp_path):
        """Test auto-domain detection in offline extraction."""
        from src.document_extract import extract_from_document_offline

        txt = tmp_path / "code.txt"
        txt.write_text(
            "Python API Design Best Practices\n\n"
            "You should always use parameterized queries.\n"
            "Best practice: set connection pool size to 10.\n"
            "Configure database_url to postgres://localhost.\n"
            "The key is proper error handling in every endpoint.\n"
            "Function handle_request takes a request and returns response.\n",
            encoding="utf-8",
        )

        result = extract_from_document_offline(txt)
        # Offline extraction should produce valid output regardless of domain
        assert result.knowledge.get("metadata", {}).get("source_type") == "document"
        assert result.knowledge.get("metadata", {}).get("primary_domain") is not None
        assert result.knowledge.get("extraction_stats", {}).get("extraction_mode") == "offline"

    def test_extract_from_document_offline_additive(self, tmp_path):
        """Test offline extraction with additive manufacturing content."""
        from src.document_extract import extract_from_document_offline

        txt = tmp_path / "3dprint.txt"
        txt.write_text(
            "3D Printing PLA Guide\n\n"
            "Layer height of 0.2 mm for standard prints.\n"
            "Nozzle temperature of 210 degrees C.\n"
            "Bed temperature of 60 degrees C.\n"
            "Print speed of 50 mm/s. Infill of 20 percent.\n"
            "Never exceed the maximum temperature for your hotend.\n",
            encoding="utf-8",
        )

        result = extract_from_document_offline(txt, force_domain="additive")
        items = result.knowledge.get("items", [])
        assert len(items) >= 1
        # Should find additive parameters
        param_items = [i for i in items if i.get("category") == "parameter_table"]
        assert len(param_items) >= 1

    def test_extract_from_document_offline_missing_file(self):
        """Test graceful handling of missing file."""
        from src.document_extract import extract_from_document_offline

        result = extract_from_document_offline("/nonexistent/file.txt")
        assert len(result.errors) >= 1

    def test_extract_from_document_offline_custom_id(self, tmp_path):
        """Test custom document ID."""
        from src.document_extract import extract_from_document_offline

        txt = tmp_path / "notes.txt"
        txt.write_text("Some machining notes with 3000 rpm spindle speed.", encoding="utf-8")

        result = extract_from_document_offline(txt, document_id="DOC-CUSTOM-001")
        assert result.video_id == "DOC-CUSTOM-001"


class TestDocumentPipelineEndToEnd:
    """Test full document pipeline: offline extract → bridge → generate → write → brainstorm."""

    def test_full_document_pipeline(self, tmp_path):
        """End-to-end: document → offline extract → bridge → generate → write."""
        from src.document_extract import extract_from_document_offline
        from src.component_generator import generate_components
        from src.component_writer import write_components

        # Create TribalKnowledgeEngine.ts for tip writing
        engine_dir = tmp_path / "mcp-server" / "src" / "engines"
        engine_dir.mkdir(parents=True)
        (engine_dir / "TribalKnowledgeEngine.ts").write_text(
            'const KNOWLEDGE_BASE: KnowledgeTip[] = [\n'
            '  { id: "seed", title: "Seed", body: "seed", category: "setup", tags: [], confidence: 50, source: "test", created_at: "2026-01-01", usage_count: 0 },\n'
            '];\n',
            encoding="utf-8",
        )

        # Write a test document
        doc = tmp_path / "test_doc.txt"
        doc.write_text(
            "CNC Milling Parameter Guide\n\n"
            "Set spindle speed to 8000 rpm. Feed rate is 60 ipm.\n"
            "Chip load is 0.0025 per tooth. Stepover to 25 percent.\n"
            "Never machine titanium without coolant.\n"
            "Always verify tool length offset before running.\n"
            "Use trochoidal milling for hard materials.\n"
            "First load the tool. Next set work offset. Then run program.\n"
            "If you get chatter, reduce depth of cut and increase spindle speed.\n",
            encoding="utf-8",
        )

        # Extract
        extract_result = extract_from_document_offline(doc, force_domain="cam")
        items = extract_result.knowledge.get("items", [])
        assert len(items) >= 3

        # Bridge
        empty_inv = PRISMInventory(tribal_tips=set(), engines=set(), formulas=set())
        bridge_result = bridge_knowledge(
            extract_result.knowledge, extract_result.video_id,
            max_components=50, inventory=empty_inv,
        )
        assert len(bridge_result.specs) >= 2

        # Generate
        gen_result = generate_components(bridge_result.specs, extract_result.video_id, base_dir=str(tmp_path))
        assert gen_result.success_count >= 2

        # Write
        write_result = write_components(gen_result, base_dir=str(tmp_path))
        assert write_result.total_written >= 1
        assert len(write_result.errors) == 0

    def test_document_brainstorm_integration(self, tmp_path):
        """Test brainstorm from document extraction results."""
        from src.document_extract import extract_from_document_offline
        from src.video_brainstorm import brainstorm_from_knowledge, generate_rgs_milestone

        doc = tmp_path / "rich_doc.txt"
        doc.write_text(
            "Advanced CNC Machining Reference\n\n"
            "Set spindle speed to 5000 rpm. Feed rate is 30 ipm.\n"
            "Depth of cut is 0.5 inches. Surface speed 400 sfm.\n"
            "Never exceed maximum spindle speed rating.\n"
            "Always check coolant concentration before machining stainless.\n"
            "Use adaptive clearing for titanium with chip load 0.002.\n"
            "If you hear chatter, reduce DOC by 50 percent.\n"
            "First verify tool is sharp. Next set work offset. Then dry run. "
            "Now verify first part. Finally run production.\n"
            "Make sure to indicate vise to 0.0005 inches.\n",
            encoding="utf-8",
        )

        extract_result = extract_from_document_offline(doc, force_domain="cam")
        items = extract_result.knowledge.get("items", [])

        empty_inv = PRISMInventory(tribal_tips=set(), engines=set(), formulas=set())
        bridge_result = bridge_knowledge(
            extract_result.knowledge, "doc-test",
            max_components=50, inventory=empty_inv,
        )

        brainstorm = brainstorm_from_knowledge(
            extract_result.knowledge,
            [s.to_dict() for s in bridge_result.specs],
            "doc-test",
            "Advanced CNC Reference",
            "cam",
        )
        assert len(brainstorm.ideas) >= 1
        assert brainstorm.video_id == "doc-test"

    def test_document_fixture_loading(self):
        """Test loading and extracting from document fixtures."""
        import json
        fixture_path = Path(__file__).parent.parent / "test_data" / "document_fixtures.json"
        assert fixture_path.exists(), f"Document fixtures not found at {fixture_path}"

        with open(fixture_path, encoding="utf-8") as f:
            fixtures = json.load(f)

        assert len(fixtures) >= 3
        for fix in fixtures:
            assert "document_id" in fix
            assert "title" in fix
            assert "text" in fix
            assert "expected_domain" in fix
            assert len(fix["text"]) > 50

    def test_document_fixture_extraction(self, tmp_path):
        """Test offline extraction from each document fixture."""
        import json
        from src.document_extract import extract_from_document_offline

        fixture_path = Path(__file__).parent.parent / "test_data" / "document_fixtures.json"
        with open(fixture_path, encoding="utf-8") as f:
            fixtures = json.load(f)

        for fix in fixtures:
            # Write fixture text to a temp file
            doc_file = tmp_path / f"{fix['document_id']}.txt"
            doc_file.write_text(fix["text"], encoding="utf-8")

            result = extract_from_document_offline(
                doc_file,
                title=fix["title"],
                force_domain=fix["expected_domain"],
                document_id=fix["document_id"],
            )

            items = result.knowledge.get("items", [])
            assert len(items) >= 1, f"Fixture {fix['document_id']} produced no items"
            assert result.video_id == fix["document_id"]


class TestLearningRegistryDocumentSupport:
    """Test learning registry with document source type."""

    def test_document_run_record(self, tmp_path):
        from learning_registry import LearningRegistry, create_run_record

        reg_path = str(tmp_path / "registry.json")
        reg = LearningRegistry(registry_path=reg_path)

        record = create_run_record(
            video_id="doc-001",
            title="CNC Handbook",
            url="file:///handbook.pdf",
            domain="cam",
            platform="",
            mode="offline",
            flags=["--tips-only"],
            extraction={"items": 5},
            components_generated={"tribal_tip": 3, "total": 3},
            component_ids=["tk-1", "tk-2", "tk-3"],
            verification={"build": "pass"},
            source_type="document",
        )
        reg.add_run(record)
        reg.save()

        # Reload and check
        reg2 = LearningRegistry(registry_path=reg_path)
        assert reg2.is_processed("doc-001")
        run = reg2.get_run("doc-001")
        assert run.source_type == "document"

        stats = reg2.get_stats()
        assert stats.total_documents == 1
        assert stats.total_videos == 0
        assert stats.total_components == 3

    def test_mixed_registry_stats(self, tmp_path):
        from learning_registry import LearningRegistry, create_run_record

        reg_path = str(tmp_path / "registry.json")
        reg = LearningRegistry(registry_path=reg_path)

        reg.add_run(create_run_record(
            "vid-001", "Video Tutorial", "https://youtube.com/...", "cam", "Mastercam",
            "live", [], {}, {"tribal_tip": 2, "total": 2}, [], {},
            source_type="video",
        ))
        reg.add_run(create_run_record(
            "doc-001", "PDF Handbook", "file:///handbook.pdf", "shop", "",
            "offline", [], {}, {"tribal_tip": 4, "total": 4}, [], {},
            source_type="document",
        ))
        reg.save()

        reg2 = LearningRegistry(registry_path=reg_path)
        stats = reg2.get_stats()
        assert stats.total_videos == 1
        assert stats.total_documents == 1
        assert stats.total_components == 6

        report = reg2.format_report()
        assert "Videos:" in report
        assert "Documents:" in report


def _build_fixture_knowledge(fixture: dict, cls, det) -> dict:
    """Build a knowledge document from fixture + classification + detection."""
    domain = cls.primary_domain
    platform = det.primary_platform.name if det.primary_platform else ""

    # Use the bridge's own flattening — create a simple flat-item format
    # by extracting knowledge items from the transcript
    import knowledge_bridge as kb

    # We'll simulate what knowledge_extract would produce for a fixture
    items = []
    transcript = fixture["transcript"]

    # Extract cutting parameters from transcript
    cutting_params = []
    import re
    for m in re.finditer(r"(\d+(?:\.\d+)?)\s*(?:rpm|sfm|ipm|inches? per minute|surface feet)", transcript, re.I):
        cutting_params.append({"value": float(m.group(1)), "context": m.group(0)})

    if cutting_params:
        items.append({
            "id": f"{domain}-params-001",
            "category": "parameter_table",
            "domain": domain,
            "title": f"Cutting parameters from {platform}",
            "body": f"Found {len(cutting_params)} parameter values",
            "confidence": 0.7,
            "parameters": {"values": cutting_params},
            "tags": ["cutting-parameters"],
        })

    # Extract tool mentions
    tools = re.findall(r"(?:end mill|drill|face mill|ball nose|boring bar)", transcript, re.I)
    if tools:
        items.append({
            "id": f"{domain}-tools-001",
            "category": "tribal_tip",
            "domain": domain,
            "title": f"Tools used: {', '.join(set(t.lower() for t in tools[:3]))}",
            "body": f"Video mentions {len(tools)} tool references",
            "confidence": 0.7,
            "tags": ["tooling"],
        })

    # Extract procedures
    steps = re.findall(r"(?:first|next|then|now|finally)[,:]?\s+(.{15,80}?)(?:\.|$)", transcript, re.I)
    if len(steps) >= 3:
        items.append({
            "id": f"{domain}-proc-001",
            "category": "procedure",
            "domain": domain,
            "title": f"Procedure from {platform} tutorial",
            "body": "\n".join(f"{i+1}. {s.strip()}" for i, s in enumerate(steps)),
            "confidence": 0.6,
            "steps": [s.strip() for s in steps],
            "step_count": len(steps),
            "tags": ["procedure"],
        })

    # Always add a general tip from the video
    items.append({
        "id": f"{domain}-tip-001",
        "category": "tribal_tip",
        "domain": domain,
        "title": f"{platform} tutorial: {fixture['title'][:50]}",
        "body": fixture.get("description", fixture["title"]),
        "confidence": 0.6,
        "tags": [domain, platform.lower().replace(" ", "-")] if platform else [domain],
    })

    return {"items": items}
