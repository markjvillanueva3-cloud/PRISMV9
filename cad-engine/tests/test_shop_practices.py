"""Tests for CC-MS6 — Machining Practice Knowledge Base.

Tests cover:
  - PracticeAggregator: CRUD, categories, search, safety audit
  - TroubleTreeGenerator: build, navigate, load/save
  - MaterialTipsConsolidator: CRUD, search, conflict resolution
  - Seed data integrity: all 6 categories, 5 trees, 5 materials
"""

import json
import os
import tempfile
from pathlib import Path

import pytest

# Resolve source paths
_SRC_DIR = Path(__file__).resolve().parent.parent / "src"
_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "shop_practices"

import sys
sys.path.insert(0, str(_SRC_DIR))

from practice_aggregate import (
    CATEGORIES,
    PracticeAggregator,
    PracticeRecord,
    PracticeSource,
    SafetyFinding,
)
from trouble_tree import (
    TreeNode,
    TroubleTree,
    TroubleTreeGenerator,
)
from material_tips import (
    MaterialTip,
    MaterialTipFile,
    MaterialTipsConsolidator,
    P0_MATERIALS,
    TIP_CATEGORIES,
    TipSource,
)


# =========================================================================
# PracticeAggregator Tests
# =========================================================================


class TestPracticeAggregator:
    """Test PracticeAggregator CRUD and aggregation."""

    def _make_aggregator(self, tmp_path: Path) -> PracticeAggregator:
        db_path = str(tmp_path / "practice_db.json")
        return PracticeAggregator(db_path=db_path)

    def _make_source(self, **overrides) -> PracticeSource:
        defaults = {
            "video_id": "test-vid-001",
            "channel": "Test Channel",
            "channel_subscribers": 100000,
            "views": 50000,
            "likes": 2000,
            "confidence": 0.85,
        }
        defaults.update(overrides)
        return PracticeSource(**defaults)

    def test_add_practice(self, tmp_path: Path):
        agg = self._make_aggregator(tmp_path)
        rec = agg.add_practice(
            title="Test Practice",
            category="cutting_practices",
            practice_type="cutting_practice",
            description="A test practice",
            steps=["Step 1", "Step 2"],
            warnings=["Be careful"],
            source=self._make_source(),
        )
        assert rec.practice_id == "SP-0001"
        assert rec.title == "Test Practice"
        assert rec.category == "cutting_practices"
        assert len(rec.steps) == 2
        assert rec.source_count == 1

    def test_add_duplicate_merges(self, tmp_path: Path):
        agg = self._make_aggregator(tmp_path)
        rec1 = agg.add_practice(
            title="Vise Alignment",
            category="setup_workholding",
            practice_type="setup_procedure",
            description="Align vise",
            source=self._make_source(video_id="v1"),
        )
        rec2 = agg.add_practice(
            title="Vise Alignment",
            category="setup_workholding",
            practice_type="setup_procedure",
            description="Align vise again",
            source=self._make_source(video_id="v2"),
        )
        # Should merge — same practice_id
        assert rec2.practice_id == rec1.practice_id
        assert rec2.source_count == 2

    def test_get_by_category(self, tmp_path: Path):
        agg = self._make_aggregator(tmp_path)
        agg.add_practice("P1", "cutting_practices", "cutting_practice", "desc1")
        agg.add_practice("P2", "cutting_practices", "cutting_practice", "desc2")
        agg.add_practice("P3", "tool_management", "tool_management", "desc3")

        cutting = agg.get_by_category("cutting_practices")
        assert len(cutting) == 2
        tools = agg.get_by_category("tool_management")
        assert len(tools) == 1

    def test_search(self, tmp_path: Path):
        agg = self._make_aggregator(tmp_path)
        agg.add_practice("Climb milling technique", "cutting_practices", "cutting_practice", "Use climb milling for CNC")
        agg.add_practice("Vise alignment", "setup_workholding", "setup_procedure", "Align with indicator")

        results = agg.search("climb")
        assert len(results) == 1
        assert results[0].title == "Climb milling technique"

    def test_category_counts(self, tmp_path: Path):
        agg = self._make_aggregator(tmp_path)
        agg.add_practice("P1", "cutting_practices", "cutting_practice", "d")
        agg.add_practice("P2", "cutting_practices", "cutting_practice", "d")
        agg.add_practice("P3", "machine_tips", "machine_operation", "d")

        counts = agg.category_counts()
        assert counts["cutting_practices"] == 2
        assert counts["machine_tips"] == 1
        assert counts["setup_workholding"] == 0

    def test_save_and_load(self, tmp_path: Path):
        agg = self._make_aggregator(tmp_path)
        agg.add_practice("P1", "cutting_practices", "cutting_practice", "desc", source=self._make_source())
        agg.add_practice("P2", "tool_management", "tool_management", "desc2")
        agg.save()

        agg2 = self._make_aggregator(tmp_path)
        count = agg2.load()
        assert count == 2
        assert len(agg2.get_all()) == 2

    def test_safety_audit_no_warnings(self, tmp_path: Path):
        agg = self._make_aggregator(tmp_path)
        agg.add_practice(
            "Dangerous practice",
            "cutting_practices",
            "cutting_practice",
            "This is a cutting practice with no warnings",
        )
        findings = agg.safety_audit()
        # Should flag missing warnings for safety-relevant category
        warning_findings = [f for f in findings if f.rule == "safety_category_no_warning"]
        assert len(warning_findings) >= 1

    def test_safety_audit_unsafe_keyword(self, tmp_path: Path):
        agg = self._make_aggregator(tmp_path)
        agg.add_practice(
            "Bad practice",
            "machine_tips",
            "machine_operation",
            "You should remove guard to access the spindle",
            warnings=["Don't actually do this"],
        )
        findings = agg.safety_audit()
        critical = [f for f in findings if f.severity == "critical"]
        assert len(critical) >= 1
        assert "remove guard" in critical[0].message

    def test_remove_unsafe(self, tmp_path: Path):
        agg = self._make_aggregator(tmp_path)
        agg.add_practice("Bad", "machine_tips", "machine_operation", "bypass interlock now", warnings=["test"])
        agg.add_practice("Good", "machine_tips", "machine_operation", "Follow safety procedures", warnings=["Always wear PPE"])

        findings = agg.safety_audit()
        removed = agg.remove_unsafe(findings)
        assert removed >= 1
        remaining = agg.get_all()
        assert all("bypass" not in p.description for p in remaining)

    def test_source_authority_weight(self):
        high = PracticeSource(
            video_id="v1", channel="Big", channel_subscribers=500000,
            views=100000, likes=5000, confidence=0.95,
        )
        low = PracticeSource(
            video_id="v2", channel="Small", channel_subscribers=1000,
            views=500, likes=10, confidence=0.3,
        )
        assert high.authority_weight() > low.authority_weight()

    def test_practice_record_serialization(self):
        rec = PracticeRecord(
            practice_id="SP-TEST",
            title="Test",
            category="cutting_practices",
            practice_type="cutting_practice",
            description="Test desc",
            steps=["S1"],
            warnings=["W1"],
        )
        d = rec.to_dict()
        rec2 = PracticeRecord.from_dict(d)
        assert rec2.practice_id == rec.practice_id
        assert rec2.steps == rec.steps
        assert rec2.warnings == rec.warnings

    def test_all_six_categories_constant(self):
        assert len(CATEGORIES) == 6
        assert "setup_workholding" in CATEGORIES
        assert "cutting_practices" in CATEGORIES
        assert "tool_management" in CATEGORIES
        assert "troubleshooting" in CATEGORIES
        assert "material_tips" in CATEGORIES
        assert "machine_tips" in CATEGORIES

    def test_mark_safety_reviewed(self, tmp_path: Path):
        agg = self._make_aggregator(tmp_path)
        rec = agg.add_practice("Test", "cutting_practices", "cutting_practice", "desc")
        assert not rec.safety_reviewed
        assert agg.mark_safety_reviewed(rec.practice_id)
        assert agg.get(rec.practice_id).safety_reviewed


# =========================================================================
# TroubleTreeGenerator Tests
# =========================================================================


class TestTroubleTreeGenerator:
    """Test troubleshooting decision tree generation and navigation."""

    def _make_generator(self, tmp_path: Path) -> TroubleTreeGenerator:
        data_dir = str(tmp_path / "trees")
        return TroubleTreeGenerator(data_dir=data_dir)

    def test_build_tree(self, tmp_path: Path):
        gen = self._make_generator(tmp_path)
        tree = gen.build_tree(
            tree_id="TT-TEST",
            title="Test Tree",
            symptom="Something is wrong",
            causes=[
                {
                    "text": "Cause A",
                    "confidence": 0.8,
                    "diagnostics": [
                        {
                            "text": "Check this",
                            "solutions": ["Fix it", "Replace it"],
                        }
                    ],
                },
                {
                    "text": "Cause B",
                    "confidence": 0.6,
                    "diagnostics": [
                        {
                            "text": "Measure that",
                            "solutions": ["Adjust it"],
                        }
                    ],
                },
            ],
            material_context=["steel"],
            tags=["test"],
        )
        assert tree.tree_id == "TT-TEST"
        assert tree.root.node_type == "symptom"
        assert len(tree.root.children) == 2
        assert tree.cause_count() == 2
        assert tree.solution_count() == 3

    def test_navigate(self, tmp_path: Path):
        gen = self._make_generator(tmp_path)
        gen.build_tree(
            tree_id="TT-NAV",
            title="Nav Test",
            symptom="Chatter",
            causes=[
                {
                    "text": "Cause 1",
                    "confidence": 0.8,
                    "diagnostics": [{"text": "Diag 1", "solutions": ["Sol 1"]}],
                },
            ],
        )
        # Navigate to root
        root = gen.navigate("TT-NAV")
        assert root.node_type == "symptom"

        # Navigate to first cause
        cause = gen.navigate("TT-NAV", [0])
        assert cause.node_type == "cause"
        assert "Cause 1" in cause.text

        # Navigate to diagnostic
        diag = gen.navigate("TT-NAV", [0, 0])
        assert diag.node_type == "diagnostic"

        # Navigate to solution
        sol = gen.navigate("TT-NAV", [0, 0, 0])
        assert sol.node_type == "solution"

        # Invalid path
        assert gen.navigate("TT-NAV", [5]) is None
        assert gen.navigate("NONEXISTENT") is None

    def test_save_and_load(self, tmp_path: Path):
        gen = self._make_generator(tmp_path)
        gen.build_tree(
            tree_id="TT-SAVE",
            title="Save Test",
            symptom="Test symptom",
            causes=[{"text": "C1", "confidence": 0.7, "diagnostics": [{"text": "D1", "solutions": ["S1"]}]}],
        )
        gen.save_all()

        gen2 = self._make_generator(tmp_path)
        count = gen2.load_all()
        assert count == 1
        tree = gen2.get("TT-SAVE")
        assert tree is not None
        assert tree.solution_count() == 1

    def test_search(self, tmp_path: Path):
        gen = self._make_generator(tmp_path)
        gen.build_tree("TT-A", "Chatter Tree", "Chatter vibration", causes=[])
        gen.build_tree("TT-B", "Surface Finish", "Poor surface finish", causes=[])

        results = gen.search("chatter")
        assert len(results) == 1
        assert results[0].tree_id == "TT-A"

    def test_tree_serialization(self):
        node = TreeNode(
            node_id="N1",
            node_type="symptom",
            text="Test",
            children=[
                TreeNode(node_id="N2", node_type="cause", text="Cause"),
            ],
        )
        d = node.to_dict()
        node2 = TreeNode.from_dict(d)
        assert node2.node_id == "N1"
        assert len(node2.children) == 1
        assert node2.children[0].node_id == "N2"

    def test_tree_depth_and_leaf_count(self):
        leaf = TreeNode(node_id="L1", node_type="solution", text="Fix")
        mid = TreeNode(node_id="M1", node_type="diagnostic", text="Check", children=[leaf])
        root = TreeNode(node_id="R1", node_type="symptom", text="Problem", children=[mid])

        assert root.depth() == 3
        assert root.leaf_count() == 1

    def test_list_trees(self, tmp_path: Path):
        gen = self._make_generator(tmp_path)
        gen.build_tree("TT-1", "T1", "S1", causes=[])
        gen.build_tree("TT-2", "T2", "S2", causes=[])

        trees = gen.list_trees()
        assert len(trees) == 2


# =========================================================================
# MaterialTipsConsolidator Tests
# =========================================================================


class TestMaterialTipsConsolidator:
    """Test material tips consolidation and conflict resolution."""

    def _make_consolidator(self, tmp_path: Path) -> MaterialTipsConsolidator:
        data_dir = str(tmp_path / "tips")
        return MaterialTipsConsolidator(data_dir=data_dir)

    def _make_source(self, **overrides) -> TipSource:
        defaults = {
            "video_id": "test-vid",
            "channel": "Test",
            "channel_subscribers": 100000,
            "views": 50000,
            "likes": 2000,
            "confidence": 0.85,
        }
        defaults.update(overrides)
        return TipSource(**defaults)

    def test_add_tip(self, tmp_path: Path):
        con = self._make_consolidator(tmp_path)
        tip = con.add_tip(
            material="aluminum",
            category="speeds_feeds",
            tip_text="Run high speeds",
            detail="SFM 800+",
            source=self._make_source(),
        )
        assert tip.tip_id == "ALU-0001"
        assert tip.material == "aluminum"
        assert tip.source_count == 1

    def test_add_duplicate_merges(self, tmp_path: Path):
        con = self._make_consolidator(tmp_path)
        t1 = con.add_tip("aluminum", "speeds_feeds", "Run high speeds", source=self._make_source(video_id="v1"))
        t2 = con.add_tip("aluminum", "speeds_feeds", "Run high speeds", source=self._make_source(video_id="v2"))
        assert t2.tip_id == t1.tip_id
        assert t2.source_count == 2

    def test_get_tips_ranked(self, tmp_path: Path):
        con = self._make_consolidator(tmp_path)
        con.add_tip("steel", "speeds_feeds", "Low speed tip", source=self._make_source(confidence=0.3))
        con.add_tip("steel", "tooling", "High confidence tip", source=self._make_source(confidence=0.95))

        tips = con.get_tips("steel")
        assert len(tips) == 2
        assert tips[0].consensus_weight > tips[1].consensus_weight

    def test_get_tips_by_category(self, tmp_path: Path):
        con = self._make_consolidator(tmp_path)
        con.add_tip("aluminum", "speeds_feeds", "Speed tip")
        con.add_tip("aluminum", "coolant", "Coolant tip")
        con.add_tip("aluminum", "speeds_feeds", "Another speed tip")

        sf = con.get_tips_by_category("aluminum", "speeds_feeds")
        assert len(sf) == 2
        cool = con.get_tips_by_category("aluminum", "coolant")
        assert len(cool) == 1

    def test_save_and_load(self, tmp_path: Path):
        con = self._make_consolidator(tmp_path)
        con.add_tip("aluminum", "speeds_feeds", "Tip A", source=self._make_source())
        con.add_tip("steel", "tooling", "Tip B", source=self._make_source())
        con.save_all()

        con2 = self._make_consolidator(tmp_path)
        total = con2.load_all()
        assert total == 2
        assert len(con2.get_tips("aluminum")) == 1
        assert len(con2.get_tips("steel")) == 1

    def test_conflict_detection(self, tmp_path: Path):
        con = self._make_consolidator(tmp_path)
        con.add_tip("aluminum", "coolant", "use flood coolant for best results")
        con.add_tip("aluminum", "coolant", "use mist coolant for aluminum")

        conflicts = con.resolve_conflicts("aluminum")
        assert len(conflicts) >= 1

    def test_search(self, tmp_path: Path):
        con = self._make_consolidator(tmp_path)
        con.add_tip("aluminum", "tooling", "Use ZrN coated tools")
        con.add_tip("steel", "tooling", "Use TiAlN coated tools")

        results = con.search("ZrN")
        assert len(results) == 1
        assert results[0].material == "aluminum"

        results_all = con.search("coated")
        assert len(results_all) == 2

    def test_search_by_material(self, tmp_path: Path):
        con = self._make_consolidator(tmp_path)
        con.add_tip("aluminum", "tooling", "Use ZrN coated tools")
        con.add_tip("steel", "tooling", "Use TiAlN coated tools")

        results = con.search("coated", material="aluminum")
        assert len(results) == 1

    def test_tip_counts(self, tmp_path: Path):
        con = self._make_consolidator(tmp_path)
        con.add_tip("aluminum", "tooling", "T1")
        con.add_tip("aluminum", "coolant", "T2")
        con.add_tip("steel", "tooling", "T3")

        counts = con.tip_counts()
        assert counts["aluminum"] == 2
        assert counts["steel"] == 1

    def test_get_all_materials(self, tmp_path: Path):
        con = self._make_consolidator(tmp_path)
        con.add_tip("aluminum", "tooling", "T1")
        con.add_tip("titanium", "coolant", "T2")

        mats = con.get_all_materials()
        assert set(mats) == {"aluminum", "titanium"}

    def test_p0_materials_constant(self):
        assert len(P0_MATERIALS) == 5
        assert "aluminum" in P0_MATERIALS
        assert "steel" in P0_MATERIALS
        assert "stainless_steel" in P0_MATERIALS
        assert "titanium" in P0_MATERIALS
        assert "cast_iron" in P0_MATERIALS

    def test_tip_categories_constant(self):
        assert len(TIP_CATEGORIES) == 5
        assert "speeds_feeds" in TIP_CATEGORIES

    def test_tip_serialization(self):
        tip = MaterialTip(
            tip_id="TEST-001",
            material="aluminum",
            category="tooling",
            tip_text="Test tip",
            sources=[TipSource(video_id="v1", confidence=0.9)],
            source_count=1,
        )
        d = tip.to_dict()
        tip2 = MaterialTip.from_dict(d)
        assert tip2.tip_id == tip.tip_id
        assert len(tip2.sources) == 1


# =========================================================================
# Seed Data Integrity Tests
# =========================================================================


class TestSeedDataIntegrity:
    """Verify seed data files are complete and well-formed."""

    def test_practice_db_has_all_categories(self):
        db_path = _DATA_DIR / "practice_db.json"
        with open(db_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        cats = data["categories"]
        for cat in CATEGORIES:
            assert cat in cats, f"Missing category: {cat}"
            assert cats[cat]["practice_count"] >= 1, f"Empty category: {cat}"

    def test_practice_db_total_count(self):
        db_path = _DATA_DIR / "practice_db.json"
        with open(db_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        total = sum(
            len(cat_data["practices"])
            for cat_data in data["categories"].values()
        )
        assert total >= 30, f"Expected at least 30 seed practices, got {total}"
        assert data["total_practices"] == total

    def test_all_practices_have_required_fields(self):
        db_path = _DATA_DIR / "practice_db.json"
        with open(db_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for cat_data in data["categories"].values():
            for p in cat_data["practices"]:
                assert p.get("practice_id"), "Missing practice_id"
                assert p.get("title"), f"Missing title on {p.get('practice_id')}"
                assert p.get("category"), f"Missing category on {p.get('practice_id')}"
                assert p.get("practice_type"), f"Missing practice_type on {p.get('practice_id')}"
                assert p.get("description"), f"Missing description on {p.get('practice_id')}"
                assert len(p.get("steps", [])) >= 1, f"No steps on {p.get('practice_id')}"

    def test_all_practices_have_provenance(self):
        db_path = _DATA_DIR / "practice_db.json"
        with open(db_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for cat_data in data["categories"].values():
            for p in cat_data["practices"]:
                sources = p.get("sources", [])
                assert len(sources) >= 1, f"No sources on {p['practice_id']}"
                for s in sources:
                    assert s.get("video_id"), f"No video_id in source for {p['practice_id']}"
                    assert s.get("confidence") is not None, f"No confidence for {p['practice_id']}"

    def test_all_practices_safety_reviewed(self):
        db_path = _DATA_DIR / "practice_db.json"
        with open(db_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for cat_data in data["categories"].values():
            for p in cat_data["practices"]:
                assert p.get("safety_reviewed") is True, f"Not safety reviewed: {p['practice_id']}"

    def test_no_unsafe_practices_in_seed(self):
        """Verify zero unsafe practices in seed data."""
        db_path = _DATA_DIR / "practice_db.json"
        agg = PracticeAggregator(db_path=str(db_path))
        agg.load()
        findings = agg.safety_audit()
        critical = [f for f in findings if f.severity == "critical"]
        assert len(critical) == 0, f"Unsafe practices found: {[f.message for f in critical]}"

    def test_trouble_trees_exist(self):
        tree_dir = _DATA_DIR / "trouble_trees"
        expected_trees = ["chatter", "surface_finish", "tool_wear", "dimensional_accuracy", "chip_evacuation"]
        for name in expected_trees:
            path = tree_dir / f"{name}.json"
            assert path.exists(), f"Missing tree: {name}"

    def test_trouble_trees_have_5_plus(self):
        tree_dir = _DATA_DIR / "trouble_trees"
        gen = TroubleTreeGenerator(data_dir=str(tree_dir))
        count = gen.load_all()
        assert count >= 5, f"Only {count} trees, need 5+"

    def test_trouble_trees_valid_structure(self):
        tree_dir = _DATA_DIR / "trouble_trees"
        gen = TroubleTreeGenerator(data_dir=str(tree_dir))
        gen.load_all()

        for tree in gen.list_trees():
            assert tree.root.node_type == "symptom"
            assert tree.symptom
            assert tree.title
            assert tree.cause_count() >= 1, f"Tree {tree.tree_id} has no causes"
            assert tree.solution_count() >= 1, f"Tree {tree.tree_id} has no solutions"

    def test_material_tips_cover_p0(self):
        tips_dir = _DATA_DIR / "material_tips"
        for mat in P0_MATERIALS:
            path = tips_dir / f"{mat}.json"
            assert path.exists(), f"Missing material tips: {mat}"

    def test_material_tips_valid(self):
        tips_dir = _DATA_DIR / "material_tips"
        con = MaterialTipsConsolidator(data_dir=str(tips_dir))
        total = con.load_all()
        assert total >= 25, f"Only {total} tips, expected 25+"

        for mat in P0_MATERIALS:
            tips = con.get_tips(mat)
            assert len(tips) >= 4, f"Only {len(tips)} tips for {mat}, need 4+"

    def test_load_practice_db_with_aggregator(self):
        """Verify the seed DB can be loaded by the aggregator."""
        db_path = _DATA_DIR / "practice_db.json"
        agg = PracticeAggregator(db_path=str(db_path))
        count = agg.load()
        assert count >= 30, f"Expected at least 30 seed practices, got {count}"

        counts = agg.category_counts()
        for cat in CATEGORIES:
            assert counts[cat] >= 5, f"Category {cat} has {counts[cat]} practices, expected 5+"

    def test_weighted_consensus_in_seed(self):
        """All seed practices should have confidence > 0."""
        db_path = _DATA_DIR / "practice_db.json"
        agg = PracticeAggregator(db_path=str(db_path))
        agg.load()

        for p in agg.get_all():
            assert p.consensus_confidence > 0, f"Zero confidence on {p.practice_id}"
            assert p.source_count >= 1, f"No sources on {p.practice_id}"


# =========================================================================
# Edge Cases
# =========================================================================


class TestEdgeCases:
    """Edge case and boundary tests."""

    def test_empty_aggregator(self, tmp_path: Path):
        agg = PracticeAggregator(db_path=str(tmp_path / "empty.json"))
        assert agg.load() == 0
        assert agg.get_all() == []
        assert agg.search("anything") == []

    def test_empty_tree_generator(self, tmp_path: Path):
        gen = TroubleTreeGenerator(data_dir=str(tmp_path / "empty_trees"))
        assert gen.load_all() == 0
        assert gen.list_trees() == []
        assert gen.search("anything") == []

    def test_empty_consolidator(self, tmp_path: Path):
        con = MaterialTipsConsolidator(data_dir=str(tmp_path / "empty_tips"))
        assert con.load_all() == 0
        assert con.get_tips("aluminum") == []
        assert con.search("anything") == []

    def test_authority_weight_bounds(self):
        # Minimum authority
        low = PracticeSource(video_id="v", confidence=0.0)
        assert 0 <= low.authority_weight() <= 1

        # Maximum authority
        high = PracticeSource(
            video_id="v", channel_subscribers=1000000,
            views=500000, likes=25000, confidence=1.0,
        )
        assert 0 <= high.authority_weight() <= 1

    def test_tree_with_no_causes(self, tmp_path: Path):
        gen = TroubleTreeGenerator(data_dir=str(tmp_path / "trees"))
        tree = gen.build_tree("TT-EMPTY", "Empty", "No causes known", causes=[])
        assert tree.cause_count() == 0
        assert tree.solution_count() == 0
        assert tree.root.depth() == 1

    def test_practice_get_nonexistent(self, tmp_path: Path):
        agg = PracticeAggregator(db_path=str(tmp_path / "db.json"))
        assert agg.get("NONEXISTENT") is None

    def test_conflict_no_tips(self, tmp_path: Path):
        con = MaterialTipsConsolidator(data_dir=str(tmp_path / "tips"))
        assert con.resolve_conflicts("nonexistent") == []
