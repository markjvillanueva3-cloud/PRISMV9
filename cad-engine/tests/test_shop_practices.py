"""Tests for CC-MS6 Machining Practice Knowledge Base.

Tests practice_aggregate, trouble_tree, and material_tips modules
with 6 practice categories, troubleshooting trees, and material tips.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path

import pytest

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from practice_aggregate import (
    CATEGORIES,
    PracticeAggregator,
    PracticeRecord,
    PracticeSource,
    SafetyFinding,
)
from trouble_tree import TreeNode, TroubleTree, TroubleTreeGenerator
from material_tips import (
    MaterialTip,
    MaterialTipFile,
    MaterialTipsConsolidator,
    TipSource,
    P0_MATERIALS,
    TIP_CATEGORIES,
)


# =====================================================================
# Test data
# =====================================================================

def _make_source(**kwargs) -> PracticeSource:
    defaults = {
        "video_id": "v001",
        "channel": "TestShop",
        "channel_subscribers": 100000,
        "views": 50000,
        "likes": 2500,
        "confidence": 0.85,
    }
    defaults.update(kwargs)
    return PracticeSource(**defaults)


def _make_tip_source(**kwargs) -> TipSource:
    defaults = {
        "video_id": "v001",
        "channel": "TestShop",
        "channel_subscribers": 100000,
        "views": 50000,
        "likes": 2500,
        "confidence": 0.85,
    }
    defaults.update(kwargs)
    return TipSource(**defaults)


# =====================================================================
# PracticeAggregator tests
# =====================================================================


class TestPracticeSource:
    def test_authority_weight_range(self):
        src = _make_source()
        w = src.authority_weight()
        assert 0 <= w <= 1.0

    def test_zero_subscribers(self):
        src = _make_source(channel_subscribers=0, views=0, likes=0, confidence=0.5)
        w = src.authority_weight()
        assert w > 0  # Should have baseline weight

    def test_high_authority(self):
        src = _make_source(channel_subscribers=1000000, views=500000, likes=25000, confidence=0.95)
        w = src.authority_weight()
        assert w > 0.6

    def test_to_dict(self):
        src = _make_source()
        d = src.to_dict()
        assert d["video_id"] == "v001"
        assert d["channel"] == "TestShop"


class TestPracticeRecord:
    def test_to_dict(self):
        rec = PracticeRecord(
            practice_id="SP-0001",
            title="Test Practice",
            category="setup_workholding",
            practice_type="setup_procedure",
            description="Test description",
            steps=["Step 1", "Step 2"],
            warnings=["Be careful"],
        )
        d = rec.to_dict()
        assert d["practice_id"] == "SP-0001"
        assert d["category"] == "setup_workholding"
        assert len(d["steps"]) == 2

    def test_from_dict_round_trip(self):
        rec = PracticeRecord(
            practice_id="SP-0002",
            title="Round trip test",
            category="cutting_practices",
            practice_type="cutting_practice",
            description="Desc",
            sources=[_make_source()],
            source_count=1,
        )
        d = rec.to_dict()
        rec2 = PracticeRecord.from_dict(d)
        assert rec2.practice_id == rec.practice_id
        assert rec2.category == rec.category
        assert len(rec2.sources) == 1


class TestPracticeAggregator:
    def setup_method(self):
        self.tmp = tempfile.mkdtemp()
        self.db_path = os.path.join(self.tmp, "test_db.json")
        self.agg = PracticeAggregator(db_path=self.db_path)

    def test_add_practice(self):
        rec = self.agg.add_practice(
            title="Indicate vise with DTI",
            category="setup_workholding",
            practice_type="workholding_technique",
            description="Use a dial test indicator to align vise jaws",
            steps=["Mount DTI in spindle", "Sweep along fixed jaw", "Adjust until <0.001\""],
            source=_make_source(),
        )
        assert rec.practice_id.startswith("SP-")
        assert self.agg.get(rec.practice_id) is not None

    def test_add_all_six_categories(self):
        categories = [
            ("setup_workholding", "workholding_technique", "Vise setup"),
            ("cutting_practices", "cutting_practice", "Climb milling aluminum"),
            ("tool_management", "tool_management", "Insert replacement criteria"),
            ("troubleshooting", "troubleshooting", "Chatter diagnosis"),
            ("material_tips", "material_handling", "Aluminum coolant tips"),
            ("machine_tips", "machine_operation", "Haas warm-up procedure"),
        ]
        for cat, ptype, title in categories:
            self.agg.add_practice(
                title=title,
                category=cat,
                practice_type=ptype,
                description=f"Description for {title}",
                source=_make_source(),
            )

        counts = self.agg.category_counts()
        assert all(counts[c] >= 1 for c in CATEGORIES)

    def test_merge_similar(self):
        """Adding a similar practice should merge, not create duplicate."""
        self.agg.add_practice(
            title="Indicate vise with DTI",
            category="setup_workholding",
            practice_type="workholding_technique",
            description="First source",
            source=_make_source(video_id="v001"),
        )
        self.agg.add_practice(
            title="Indicate vise with DTI",
            category="setup_workholding",
            practice_type="workholding_technique",
            description="Second source",
            source=_make_source(video_id="v002"),
        )
        all_pracs = self.agg.get_all()
        assert len(all_pracs) == 1
        assert all_pracs[0].source_count == 2

    def test_get_by_category(self):
        self.agg.add_practice("T1", "setup_workholding", "setup_procedure", "D1")
        self.agg.add_practice("T2", "cutting_practices", "cutting_practice", "D2")
        self.agg.add_practice("T3", "setup_workholding", "workholding_technique", "D3")

        setup = self.agg.get_by_category("setup_workholding")
        assert len(setup) == 2
        cutting = self.agg.get_by_category("cutting_practices")
        assert len(cutting) == 1

    def test_search(self):
        self.agg.add_practice("Vise alignment", "setup_workholding", "setup_procedure", "Use DTI")
        self.agg.add_practice("Speed for aluminum", "cutting_practices", "cutting_practice", "High RPM")

        results = self.agg.search("vise")
        assert len(results) == 1
        assert "Vise" in results[0].title

    def test_save_and_load(self):
        self.agg.add_practice("Test 1", "setup_workholding", "setup_procedure", "Desc 1")
        self.agg.add_practice("Test 2", "cutting_practices", "cutting_practice", "Desc 2")
        self.agg.save()

        agg2 = PracticeAggregator(db_path=self.db_path)
        count = agg2.load()
        assert count == 2
        assert len(agg2.get_all()) == 2

    def test_aggregate_confidence(self):
        self.agg.add_practice(
            "T1", "setup_workholding", "setup_procedure", "D1",
            source=_make_source(confidence=0.9),
        )
        conf = self.agg.aggregate_confidence()
        assert conf["setup_workholding"] > 0

    def test_safety_audit_unsafe_keyword(self):
        self.agg.add_practice(
            "Bad practice",
            "machine_tips",
            "machine_operation",
            "Remove guard before operation",
            source=_make_source(),
        )
        findings = self.agg.safety_audit()
        criticals = [f for f in findings if f.severity == "critical"]
        assert len(criticals) >= 1
        assert any("remove guard" in f.message.lower() for f in criticals)

    def test_safety_audit_rpm_limit(self):
        self.agg.add_practice(
            "High speed titanium",
            "cutting_practices",
            "cutting_practice",
            "Run titanium at 15000 RPM for best results",
            source=_make_source(),
        )
        findings = self.agg.safety_audit()
        rpm_findings = [f for f in findings if f.rule == "rpm_limit"]
        assert len(rpm_findings) >= 1

    def test_remove_unsafe(self):
        rec = self.agg.add_practice(
            "Dangerous",
            "machine_tips",
            "machine_operation",
            "Bypass interlock for faster access",
        )
        findings = self.agg.safety_audit()
        removed = self.agg.remove_unsafe(findings)
        assert removed >= 1
        assert self.agg.get(rec.practice_id) is None

    def test_mark_safety_reviewed(self):
        rec = self.agg.add_practice("Safe practice", "setup_workholding", "setup_procedure", "Normal")
        assert not rec.safety_reviewed
        self.agg.mark_safety_reviewed(rec.practice_id)
        assert self.agg.get(rec.practice_id).safety_reviewed

    def test_categories_constant(self):
        assert len(CATEGORIES) == 6
        assert "setup_workholding" in CATEGORIES
        assert "troubleshooting" in CATEGORIES


# =====================================================================
# TroubleTree tests
# =====================================================================


class TestTreeNode:
    def test_to_dict_from_dict(self):
        node = TreeNode(
            node_id="n1",
            node_type="symptom",
            text="Chatter vibration",
            children=[
                TreeNode(node_id="n2", node_type="cause", text="Tool too long"),
                TreeNode(node_id="n3", node_type="cause", text="Speed too high"),
            ],
        )
        d = node.to_dict()
        assert d["node_id"] == "n1"
        assert len(d["children"]) == 2

        node2 = TreeNode.from_dict(d)
        assert node2.node_id == "n1"
        assert len(node2.children) == 2

    def test_leaf_count(self):
        root = TreeNode("r", "symptom", "Root", children=[
            TreeNode("c1", "cause", "C1", children=[
                TreeNode("s1", "solution", "S1"),
                TreeNode("s2", "solution", "S2"),
            ]),
            TreeNode("c2", "cause", "C2", children=[
                TreeNode("s3", "solution", "S3"),
            ]),
        ])
        assert root.leaf_count() == 3

    def test_depth(self):
        root = TreeNode("r", "symptom", "Root", children=[
            TreeNode("c1", "cause", "C1", children=[
                TreeNode("d1", "diagnostic", "D1", children=[
                    TreeNode("s1", "solution", "S1"),
                ]),
            ]),
        ])
        assert root.depth() == 4


class TestTroubleTree:
    def test_solution_count(self):
        root = TreeNode("r", "symptom", "Root", children=[
            TreeNode("c1", "cause", "C1", children=[
                TreeNode("d1", "diagnostic", "D1", children=[
                    TreeNode("s1", "solution", "Fix 1"),
                    TreeNode("s2", "solution", "Fix 2"),
                ]),
            ]),
        ])
        tree = TroubleTree(tree_id="T1", title="Test", symptom="Problem", root=root)
        assert tree.solution_count() == 2
        assert tree.cause_count() == 1

    def test_to_dict_from_dict(self):
        root = TreeNode("r", "symptom", "Chatter", children=[
            TreeNode("c1", "cause", "Tool too long"),
        ])
        tree = TroubleTree(
            tree_id="chatter",
            title="Chatter Diagnosis",
            symptom="Chatter vibration during cutting",
            root=root,
            material_context=["steel", "aluminum"],
            tags=["vibration", "chatter"],
        )
        d = tree.to_dict()
        tree2 = TroubleTree.from_dict(d)
        assert tree2.tree_id == "chatter"
        assert tree2.symptom == tree.symptom
        assert len(tree2.material_context) == 2


class TestTroubleTreeGenerator:
    def setup_method(self):
        self.tmp = tempfile.mkdtemp()
        self.gen = TroubleTreeGenerator(data_dir=self.tmp)

    def test_build_tree(self):
        tree = self.gen.build_tree(
            tree_id="chatter",
            title="Chatter Diagnosis",
            symptom="Chatter marks on workpiece surface",
            causes=[
                {
                    "text": "Tool stickout too long",
                    "confidence": 0.9,
                    "diagnostics": [{
                        "text": "Measure tool stickout ratio",
                        "solutions": [
                            "Reduce stickout to 3:1 ratio",
                            "Use shorter tool",
                        ],
                    }],
                },
                {
                    "text": "Spindle speed in resonance zone",
                    "confidence": 0.7,
                    "diagnostics": [{
                        "text": "Check stability lobe diagram",
                        "solutions": [
                            "Increase/decrease RPM by 10-15%",
                            "Reduce DOC",
                        ],
                    }],
                },
            ],
            material_context=["steel"],
            tags=["chatter", "vibration"],
        )

        assert tree.tree_id == "chatter"
        assert tree.cause_count() == 2
        assert tree.solution_count() == 4
        assert tree.root.node_type == "symptom"
        assert len(tree.root.children) == 2

    def test_save_and_load(self):
        self.gen.build_tree(
            tree_id="finish",
            title="Poor Surface Finish",
            symptom="Surface roughness exceeds spec",
            causes=[{
                "text": "Worn tool",
                "confidence": 0.85,
                "diagnostics": [{
                    "text": "Inspect insert edge",
                    "solutions": ["Replace insert"],
                }],
            }],
        )

        self.gen.save_all()
        assert os.path.exists(os.path.join(self.tmp, "finish.json"))

        gen2 = TroubleTreeGenerator(data_dir=self.tmp)
        count = gen2.load_all()
        assert count == 1
        loaded = gen2.get("finish")
        assert loaded is not None
        assert loaded.cause_count() == 1

    def test_navigate(self):
        self.gen.build_tree(
            tree_id="nav_test",
            title="Nav Test",
            symptom="Problem",
            causes=[
                {
                    "text": "Cause A",
                    "confidence": 0.8,
                    "diagnostics": [{
                        "text": "Check A",
                        "solutions": ["Fix A"],
                    }],
                },
                {
                    "text": "Cause B",
                    "confidence": 0.6,
                    "diagnostics": [{
                        "text": "Check B",
                        "solutions": ["Fix B"],
                    }],
                },
            ],
        )

        # Navigate to root
        root = self.gen.navigate("nav_test")
        assert root is not None
        assert root.node_type == "symptom"

        # Navigate to first cause
        cause = self.gen.navigate("nav_test", [0])
        assert cause is not None
        assert cause.node_type == "cause"
        assert "Cause A" in cause.text

        # Navigate to second cause's diagnostic
        diag = self.gen.navigate("nav_test", [1, 0])
        assert diag is not None
        assert diag.node_type == "diagnostic"

        # Invalid path returns None
        assert self.gen.navigate("nav_test", [99]) is None
        assert self.gen.navigate("nonexistent") is None

    def test_search(self):
        self.gen.build_tree("t1", "Chatter Fix", "Chatter during milling", causes=[])
        self.gen.build_tree("t2", "Finish Issue", "Poor surface finish", causes=[])

        results = self.gen.search("chatter")
        assert len(results) == 1
        assert results[0].tree_id == "t1"

    def test_list_trees(self):
        self.gen.build_tree("a", "A", "Symptom A", causes=[])
        self.gen.build_tree("b", "B", "Symptom B", causes=[])
        assert len(self.gen.list_trees()) == 2

    def test_build_five_trees(self):
        """Exit condition: 5+ troubleshooting trees."""
        trees = [
            ("chatter", "Chatter Diagnosis", "Chatter marks on surface"),
            ("finish", "Surface Finish Issues", "Roughness exceeds spec"),
            ("dimension", "Dimensional Accuracy", "Parts out of tolerance"),
            ("tool_break", "Tool Breakage", "Tool breaking during operation"),
            ("chip_control", "Chip Control", "Long stringy chips wrapping"),
        ]
        for tid, title, symptom in trees:
            self.gen.build_tree(
                tree_id=tid,
                title=title,
                symptom=symptom,
                causes=[{
                    "text": f"Common cause for {tid}",
                    "confidence": 0.8,
                    "diagnostics": [{
                        "text": f"Check for {tid}",
                        "solutions": [f"Fix for {tid}"],
                    }],
                }],
            )

        assert len(self.gen.list_trees()) >= 5


# =====================================================================
# MaterialTips tests
# =====================================================================


class TestMaterialTip:
    def test_to_dict_from_dict(self):
        tip = MaterialTip(
            tip_id="ALU-0001",
            material="aluminum",
            category="speeds_feeds",
            tip_text="Use high RPM, light DOC for aluminum",
            sources=[_make_tip_source()],
            source_count=1,
            consensus_weight=0.75,
        )
        d = tip.to_dict()
        tip2 = MaterialTip.from_dict(d)
        assert tip2.tip_id == "ALU-0001"
        assert tip2.material == "aluminum"
        assert len(tip2.sources) == 1


class TestMaterialTipsConsolidator:
    def setup_method(self):
        self.tmp = tempfile.mkdtemp()
        self.cons = MaterialTipsConsolidator(data_dir=self.tmp)

    def test_add_tip(self):
        tip = self.cons.add_tip(
            material="aluminum",
            category="speeds_feeds",
            tip_text="Use high RPM with light DOC",
            source=_make_tip_source(),
        )
        assert tip.tip_id.startswith("ALU-")
        tips = self.cons.get_tips("aluminum")
        assert len(tips) == 1

    def test_merge_similar(self):
        """Similar tips should be merged."""
        self.cons.add_tip("aluminum", "speeds_feeds", "Use high RPM with light DOC",
                          source=_make_tip_source(video_id="v1"))
        self.cons.add_tip("aluminum", "speeds_feeds", "Use high RPM with light DOC",
                          source=_make_tip_source(video_id="v2"))
        tips = self.cons.get_tips("aluminum")
        assert len(tips) == 1
        assert tips[0].source_count == 2

    def test_all_p0_materials(self):
        """Tips can be added for all P0 materials."""
        for mat in P0_MATERIALS:
            self.cons.add_tip(mat, "general", f"Tip for {mat}")
        mats = self.cons.get_all_materials()
        assert len(mats) == 5
        for mat in P0_MATERIALS:
            assert mat in mats

    def test_get_tips_by_category(self):
        self.cons.add_tip("steel", "speeds_feeds", "Moderate RPM for steel")
        self.cons.add_tip("steel", "coolant", "Flood coolant recommended")
        self.cons.add_tip("steel", "tooling", "Use coated carbide inserts")

        sf = self.cons.get_tips_by_category("steel", "speeds_feeds")
        assert len(sf) == 1
        cool = self.cons.get_tips_by_category("steel", "coolant")
        assert len(cool) == 1

    def test_save_and_load(self):
        self.cons.add_tip("aluminum", "speeds_feeds", "High RPM")
        self.cons.add_tip("steel", "tooling", "Coated carbide")
        self.cons.save_all()

        cons2 = MaterialTipsConsolidator(data_dir=self.tmp)
        count = cons2.load_all()
        assert count == 2
        assert len(cons2.get_tips("aluminum")) == 1
        assert len(cons2.get_tips("steel")) == 1

    def test_conflict_detection(self):
        self.cons.add_tip("aluminum", "coolant", "Use flood coolant for aluminum")
        self.cons.add_tip("aluminum", "coolant", "Use mist coolant for aluminum")
        conflicts = self.cons.resolve_conflicts("aluminum")
        assert len(conflicts) >= 1

    def test_search(self):
        self.cons.add_tip("aluminum", "speeds_feeds", "High RPM for aluminum 6061")
        self.cons.add_tip("steel", "coolant", "Flood coolant for 4140 steel")

        results = self.cons.search("RPM")
        assert len(results) == 1
        assert results[0].material == "aluminum"

    def test_search_by_material(self):
        self.cons.add_tip("aluminum", "general", "Tip A")
        self.cons.add_tip("steel", "general", "Tip B")

        results = self.cons.search("Tip", material="steel")
        assert len(results) == 1
        assert results[0].material == "steel"

    def test_tip_counts(self):
        self.cons.add_tip("aluminum", "general", "A1")
        self.cons.add_tip("aluminum", "general", "A2")
        self.cons.add_tip("steel", "general", "S1")

        counts = self.cons.tip_counts()
        assert counts["aluminum"] == 2
        assert counts["steel"] == 1

    def test_alloy_specific_tip(self):
        tip = self.cons.add_tip(
            material="aluminum",
            category="speeds_feeds",
            tip_text="6061-T6 optimal at 15000 RPM",
            alloy_specific="6061-T6",
        )
        assert tip.alloy_specific == "6061-T6"

    def test_cross_ref_materials(self):
        tip = self.cons.add_tip(
            material="stainless_steel",
            category="tooling",
            tip_text="Use same insert geometry as titanium",
            cross_ref_materials=["titanium"],
        )
        assert "titanium" in tip.cross_ref_materials

    def test_tip_categories_constant(self):
        assert len(TIP_CATEGORIES) == 5
        assert "speeds_feeds" in TIP_CATEGORIES
        assert "coolant" in TIP_CATEGORIES

    def test_p0_materials_constant(self):
        assert len(P0_MATERIALS) == 5
        assert "aluminum" in P0_MATERIALS
        assert "titanium" in P0_MATERIALS


# =====================================================================
# Integration tests
# =====================================================================


class TestIntegration:
    """End-to-end tests combining all 3 modules."""

    def test_full_workflow(self):
        """Complete workflow: add practices, build trees, consolidate tips."""
        tmp = tempfile.mkdtemp()

        # 1. Add practices across all categories
        agg = PracticeAggregator(db_path=os.path.join(tmp, "practices.json"))
        source = _make_source(confidence=0.9)

        agg.add_practice(
            "Indicate vise jaws", "setup_workholding", "workholding_technique",
            "Use DTI to sweep fixed jaw", steps=["Mount DTI", "Sweep jaw"], source=source,
        )
        agg.add_practice(
            "Climb mill aluminum", "cutting_practices", "cutting_practice",
            "Climb milling gives better finish in aluminum",
            warnings=["Ensure no backlash"], source=source,
        )
        agg.add_practice(
            "Check insert wear", "tool_management", "tool_management",
            "Replace insert when flank wear > 0.3mm", source=source,
        )
        agg.add_practice(
            "Chatter troubleshooting", "troubleshooting", "troubleshooting",
            "Reduce stickout or change RPM", source=source,
        )
        agg.add_practice(
            "Aluminum coolant", "material_tips", "material_handling",
            "Use water-soluble coolant for aluminum", source=source,
            applicable_materials=["aluminum"],
        )
        agg.add_practice(
            "Haas warm-up", "machine_tips", "machine_operation",
            "Run warm-up program for 15 min", source=source,
            applicable_machines=["Haas VF-2"],
        )

        counts = agg.category_counts()
        assert all(v >= 1 for v in counts.values()), f"Missing categories: {counts}"

        # 2. Safety audit
        findings = agg.safety_audit()
        criticals = [f for f in findings if f.severity == "critical"]
        assert len(criticals) == 0, "Safe practices should have no criticals"

        # 3. Save and reload
        agg.save()
        agg2 = PracticeAggregator(db_path=os.path.join(tmp, "practices.json"))
        loaded = agg2.load()
        assert loaded == 6

        # 4. Build troubleshooting trees
        gen = TroubleTreeGenerator(data_dir=os.path.join(tmp, "trees"))
        gen.build_tree(
            "chatter", "Chatter Fix", "Chatter during milling",
            causes=[{
                "text": "Tool too long",
                "confidence": 0.9,
                "diagnostics": [{"text": "Check L/D ratio", "solutions": ["Shorten tool"]}],
            }],
            material_context=["steel"],
        )
        gen.save_all()

        gen2 = TroubleTreeGenerator(data_dir=os.path.join(tmp, "trees"))
        assert gen2.load_all() == 1

        # 5. Material tips
        cons = MaterialTipsConsolidator(data_dir=os.path.join(tmp, "tips"))
        for mat in P0_MATERIALS:
            cons.add_tip(mat, "general", f"Best practice for {mat}", source=_make_tip_source())
        cons.save_all()

        cons2 = MaterialTipsConsolidator(data_dir=os.path.join(tmp, "tips"))
        assert cons2.load_all() == 5

    def test_provenance_chain(self):
        """All records should carry provenance."""
        tmp = tempfile.mkdtemp()
        agg = PracticeAggregator(db_path=os.path.join(tmp, "prov.json"))
        source = _make_source(video_id="VID123", confidence=0.88)
        rec = agg.add_practice(
            "Test", "setup_workholding", "setup_procedure", "Desc", source=source,
        )
        assert rec.source_count == 1
        assert rec.sources[0].video_id == "VID123"
        assert rec.consensus_confidence > 0

    def test_zero_unsafe_exit_condition(self):
        """Exit condition: zero unsafe practices after audit."""
        tmp = tempfile.mkdtemp()
        agg = PracticeAggregator(db_path=os.path.join(tmp, "safe.json"))

        # Add only safe practices
        safe_practices = [
            ("Clamp firmly", "setup_workholding", "workholding_technique", "Use proper clamping force"),
            ("Check tool wear", "tool_management", "tool_management", "Regular inspection schedule"),
            ("Use coolant", "cutting_practices", "cutting_practice", "Apply flood coolant for steel"),
        ]
        for title, cat, ptype, desc in safe_practices:
            agg.add_practice(title, cat, ptype, desc, warnings=["Follow safety procedures"])

        findings = agg.safety_audit()
        criticals = [f for f in findings if f.severity == "critical"]
        assert len(criticals) == 0
