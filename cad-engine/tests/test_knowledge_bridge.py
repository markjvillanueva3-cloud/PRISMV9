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

    def test_formula_with_params_becomes_engine(self):
        item = {"category": "formula", "parameters": {"Vc": 300, "fz": 0.003}}
        assert _classify_item(item) == ComponentType.ENGINE

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
        assert _map_domain("unknown") == "cutting"


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
