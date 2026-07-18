"""Tests for shop_ingest — CC-MS6 auto-ingest bridge."""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from shop_ingest import ingest_shop_extraction, IngestResult, _safe_tree_id, _extract_causes_from_practice


class TestIngestResult:
    def test_to_dict(self):
        r = IngestResult(practices_added=3, tips_added=2, trees_built=1)
        d = r.to_dict()
        assert d["practices_added"] == 3
        assert d["tips_added"] == 2
        assert d["trees_built"] == 1
        assert "timestamp" in d


class TestSafeTreeId:
    def test_basic(self):
        assert _safe_tree_id("Chatter Diagnosis") == "chatter_diagnosis"

    def test_special_chars(self):
        result = _safe_tree_id("Fix: tool breakage (CNC)")
        assert ":" not in result
        assert "(" not in result

    def test_long_title(self):
        result = _safe_tree_id("one two three four five six seven")
        words = result.split("_")
        assert len(words) <= 5


class TestExtractCauses:
    def test_multi_step(self):
        practice = {
            "description": "Tool is chattering",
            "steps": ["Check tool stickout", "Reduce stickout to 3:1", "Lower RPM"],
            "tips": ["Use shorter tool"],
        }
        causes = _extract_causes_from_practice(practice)
        assert len(causes) == 1
        assert causes[0]["confidence"] > 0
        assert len(causes[0]["diagnostics"]) == 1
        assert len(causes[0]["diagnostics"][0]["solutions"]) >= 2

    def test_single_step(self):
        practice = {
            "description": "Problem description",
            "steps": ["Check the thing"],
            "tips": ["Fix suggestion"],
        }
        causes = _extract_causes_from_practice(practice)
        assert len(causes) == 1
        assert causes[0]["diagnostics"][0]["solutions"] == ["Fix suggestion"]

    def test_empty_steps(self):
        practice = {"description": "Nothing", "steps": [], "tips": []}
        causes = _extract_causes_from_practice(practice)
        assert len(causes) == 0


class TestIngestShopExtraction:
    def setup_method(self):
        self.tmp = tempfile.mkdtemp()
        self.db_path = os.path.join(self.tmp, "practices.json")
        self.tree_dir = os.path.join(self.tmp, "trees")
        self.tips_dir = os.path.join(self.tmp, "tips")

    def _ingest(self, shop_data, **kwargs):
        """Call ingest with isolated temp paths."""
        return ingest_shop_extraction(
            shop_data,
            practice_db_path=self.db_path,
            tree_data_dir=self.tree_dir,
            tips_data_dir=self.tips_dir,
            **kwargs,
        )

    def test_basic_ingest(self):
        shop_data = {
            "practices": [
                {
                    "title": "Indicate vise with DTI",
                    "practice_type": "workholding_technique",
                    "description": "Use dial test indicator to align vise",
                    "steps": ["Mount DTI", "Sweep jaw", "Adjust"],
                    "warnings": ["Ensure spindle is off"],
                    "applicable_materials": [],
                    "tags": ["setup"],
                },
            ],
        }
        result = self._ingest(shop_data, video_id="v001", channel="TestShop", confidence=0.8)
        assert result.practices_added == 1
        assert result.safety_criticals == 0
        assert len(result.errors) == 0

    def test_ingest_with_materials_creates_tips(self):
        shop_data = {
            "practices": [
                {
                    "title": "Aluminum cutting tips",
                    "practice_type": "cutting_practice",
                    "description": "Tips for cutting aluminum",
                    "steps": ["Set high RPM"],
                    "tips": ["Use 3-flute end mill", "Apply mist coolant"],
                    "applicable_materials": ["aluminum"],
                    "tags": [],
                },
            ],
        }
        result = self._ingest(shop_data, video_id="v002")
        assert result.practices_added == 1
        assert result.tips_added == 2

    def test_ingest_troubleshooting_builds_tree(self):
        shop_data = {
            "practices": [
                {
                    "title": "Chatter troubleshooting",
                    "practice_type": "troubleshooting",
                    "description": "Tool chatter during milling",
                    "steps": ["Check tool stickout", "Reduce to 3:1 ratio", "Lower RPM by 10%"],
                    "tips": ["Use stub-length tool"],
                    "applicable_materials": ["steel"],
                    "tags": ["chatter"],
                },
            ],
        }
        result = self._ingest(shop_data, video_id="v003")
        assert result.practices_added == 1
        assert result.trees_built == 1

    def test_safety_audit_removes_unsafe(self):
        shop_data = {
            "practices": [
                {
                    "title": "Dangerous practice",
                    "practice_type": "machine_operation",
                    "description": "Remove guard before operation for better access",
                    "steps": ["Remove guard", "Do operation"],
                    "tags": [],
                },
            ],
        }
        result = self._ingest(shop_data, video_id="v004")
        assert result.safety_criticals >= 1
        assert len(result.safety_removed) >= 1

    def test_multiple_practices(self):
        shop_data = {
            "practices": [
                {"title": "P1", "practice_type": "setup_procedure", "description": "D1", "steps": ["S1"]},
                {"title": "P2", "practice_type": "cutting_practice", "description": "D2", "steps": ["S2"]},
                {"title": "P3", "practice_type": "tool_management", "description": "D3", "steps": ["S3"]},
            ],
        }
        result = self._ingest(shop_data, video_id="v005")
        assert result.practices_added == 3

    def test_empty_practices(self):
        result = self._ingest({"practices": []})
        assert result.practices_added == 0
        assert result.trees_built == 0
        assert result.tips_added == 0
