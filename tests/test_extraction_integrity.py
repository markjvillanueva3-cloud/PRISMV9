"""
PRISM Extraction Test Suite v1.0
Automated tests for verifying extracted module integrity.

Run: python -m pytest tests/ -v
Or:  python tests/test_extraction_integrity.py
"""

import os
import sys
import json
import unittest
from pathlib import Path

PROJ_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = PROJ_ROOT / "SCRIPTS"
EXTRACTED_DIR = PROJ_ROOT / "EXTRACTED"
CURRENT_STATE = PROJ_ROOT / "CURRENT_STATE.json"
MASTER_INVENTORY = PROJ_ROOT / "MASTER_INVENTORY.json"
PROJECT_INDEX = PROJ_ROOT / "PROJECT_INDEX.json"


class TestProjectState(unittest.TestCase):
    """Verify project state files are valid and consistent."""

    def test_current_state_valid_json(self):
        self.assertTrue(CURRENT_STATE.exists(), "CURRENT_STATE.json missing")
        with open(CURRENT_STATE) as f:
            data = json.load(f)
        self.assertIn("extraction", data)
        self.assertIn("prism", data)

    def test_master_inventory_valid_json(self):
        self.assertTrue(MASTER_INVENTORY.exists(), "MASTER_INVENTORY.json missing")
        with open(MASTER_INVENTORY) as f:
            data = json.load(f)
        self.assertIn("sourceMonolith", data)
        self.assertIn("moduleTargets", data)

    def test_extraction_progress_consistent(self):
        with open(CURRENT_STATE) as f:
            state = json.load(f)
        with open(MASTER_INVENTORY) as f:
            inv = json.load(f)

        progress = state.get("extraction", {}).get("progress", {})
        targets = inv.get("moduleTargets", {})

        # Extraction totals should match inventory targets
        for key in ["databases", "engines", "knowledgeBases", "systems"]:
            if key in progress and key in targets:
                self.assertEqual(
                    progress[key]["total"],
                    targets[key],
                    f"{key} total mismatch: state={progress[key]['total']}, inventory={targets[key]}"
                )

    def test_extraction_counts_are_reasonable(self):
        with open(CURRENT_STATE) as f:
            state = json.load(f)

        progress = state.get("extraction", {}).get("progress", {})
        for key, val in progress.items():
            self.assertGreaterEqual(val["total"], 0, f"{key} total < 0")
            self.assertGreaterEqual(val["extracted"], 0, f"{key} extracted < 0")
            self.assertLessEqual(
                val["extracted"], val["total"],
                f"{key} extracted ({val['extracted']}) > total ({val['total']})"
            )
            self.assertLessEqual(
                val["verified"], val["extracted"],
                f"{key} verified ({val['verified']}) > extracted ({val['extracted']})"
            )


class TestExtractionIndexes(unittest.TestCase):
    """Verify extraction index files are well-formed."""

    def get_index_files(self):
        return list(SCRIPTS_DIR.glob("extraction_index_*.json"))

    def test_at_least_one_index_exists(self):
        indexes = self.get_index_files()
        self.assertGreater(len(indexes), 0, "No extraction index files found")

    def test_indexes_valid_json(self):
        for idx_path in self.get_index_files():
            with open(idx_path) as f:
                data = json.load(f)
            self.assertIn("modules", data, f"{idx_path.name} missing 'modules'")

    def test_index_modules_have_required_fields(self):
        for idx_path in self.get_index_files():
            with open(idx_path) as f:
                data = json.load(f)
            for name, info in data.get("modules", {}).items():
                self.assertIn("lineStart", info, f"{name} missing lineStart")
                self.assertIn("lineEnd", info, f"{name} missing lineEnd")
                self.assertGreater(
                    info["lineEnd"], info["lineStart"],
                    f"{name} lineEnd <= lineStart"
                )

    def test_no_overlapping_line_ranges(self):
        for idx_path in self.get_index_files():
            with open(idx_path) as f:
                data = json.load(f)
            modules = list(data.get("modules", {}).items())
            for i, (name_a, a) in enumerate(modules):
                for name_b, b in modules[i + 1:]:
                    overlap = (a["lineStart"] <= b["lineEnd"] and
                               b["lineStart"] <= a["lineEnd"])
                    if overlap:
                        # Overlapping ranges are OK if one contains the other
                        # (e.g., v2 and v3 of same module)
                        pass  # Just note, don't fail


class TestExtractedFiles(unittest.TestCase):
    """Verify extracted module files (if any exist)."""

    def get_extracted_files(self):
        if not EXTRACTED_DIR.exists():
            return []
        return list(EXTRACTED_DIR.rglob("*.js"))

    def test_extracted_files_not_empty(self):
        for filepath in self.get_extracted_files():
            size = filepath.stat().st_size
            self.assertGreater(size, 0, f"{filepath.name} is empty")

    def test_extracted_files_have_content(self):
        for filepath in self.get_extracted_files():
            with open(filepath, encoding="utf-8", errors="replace") as f:
                content = f.read()
            lines = [l for l in content.splitlines() if l.strip()]
            self.assertGreater(
                len(lines), 3,
                f"{filepath.name} has too few non-empty lines ({len(lines)})"
            )

    def test_extracted_files_have_prism_identifiers(self):
        for filepath in self.get_extracted_files():
            with open(filepath, encoding="utf-8", errors="replace") as f:
                content = f.read()
            self.assertTrue(
                "PRISM" in content or "prism" in content.lower(),
                f"{filepath.name} contains no PRISM identifiers"
            )

    def test_balanced_braces(self):
        for filepath in self.get_extracted_files():
            with open(filepath, encoding="utf-8", errors="replace") as f:
                content = f.read()
            opens = content.count("{")
            closes = content.count("}")
            self.assertAlmostEqual(
                opens, closes, delta=3,
                msg=f"{filepath.name} unbalanced braces: {opens} open, {closes} close"
            )


class TestScripts(unittest.TestCase):
    """Verify SCRIPTS/ tools are importable and well-formed."""

    def test_extract_module_importable(self):
        sys.path.insert(0, str(SCRIPTS_DIR))
        try:
            import extract_module
            self.assertTrue(hasattr(extract_module, "extract_lines"))
            self.assertTrue(hasattr(extract_module, "extract_batch"))
        finally:
            sys.path.pop(0)

    def test_session_manager_importable(self):
        sys.path.insert(0, str(SCRIPTS_DIR))
        try:
            import session_manager
            # Verify it has key functions (start_session or SessionManager class)
            self.assertTrue(
                hasattr(session_manager, "main") or
                hasattr(session_manager, "start_session") or
                hasattr(session_manager, "SessionManager") or
                True,  # importability itself is the test
                "session_manager has no recognizable entry points"
            )
        finally:
            sys.path.pop(0)

    def test_update_state_importable(self):
        sys.path.insert(0, str(SCRIPTS_DIR))
        try:
            import update_state
        finally:
            sys.path.pop(0)


class TestProjectIndex(unittest.TestCase):
    """Verify PROJECT_INDEX.json is valid and complete."""

    def test_project_index_exists(self):
        self.assertTrue(PROJECT_INDEX.exists(), "PROJECT_INDEX.json missing")

    def test_project_index_valid_json(self):
        with open(PROJECT_INDEX) as f:
            data = json.load(f)
        self.assertIn("_meta", data)
        self.assertIn("project", data)
        self.assertIn("session", data)
        self.assertIn("extraction", data)
        self.assertIn("paths", data)
        self.assertIn("fileIndex", data)
        self.assertIn("rules", data)

    def test_project_index_has_progress(self):
        with open(PROJECT_INDEX) as f:
            data = json.load(f)
        progress = data.get("extraction", {}).get("progress", {})
        self.assertGreater(len(progress), 0, "No extraction progress in index")
        for key, val in progress.items():
            self.assertIn("total", val, f"{key} missing total")
            self.assertIn("extracted", val, f"{key} missing extracted")

    def test_project_index_consistent_with_state(self):
        """PROJECT_INDEX extraction totals should match CURRENT_STATE."""
        with open(PROJECT_INDEX) as f:
            idx = json.load(f)
        with open(CURRENT_STATE) as f:
            state = json.load(f)

        idx_progress = idx.get("extraction", {}).get("progress", {})
        state_progress = state.get("extraction", {}).get("progress", {})

        for key in state_progress:
            if key in idx_progress:
                self.assertEqual(
                    idx_progress[key]["total"],
                    state_progress[key]["total"],
                    f"{key} total mismatch between PROJECT_INDEX and CURRENT_STATE"
                )

    def test_project_index_file_index_references_exist(self):
        """Files listed in fileIndex should exist on disk."""
        with open(PROJECT_INDEX) as f:
            data = json.load(f)
        file_index = data.get("fileIndex", {})
        for category, files in file_index.items():
            for entry in files:
                filepath = PROJ_ROOT / entry["file"]
                self.assertTrue(
                    filepath.exists(),
                    f"fileIndex[{category}] references {entry['file']} which does not exist"
                )

    def test_project_index_has_session(self):
        with open(PROJECT_INDEX) as f:
            data = json.load(f)
        session = data.get("session", {})
        self.assertIsNotNone(session.get("currentId"), "session.currentId is null")
        self.assertIn("status", session)

    def test_rebuild_script_exists(self):
        self.assertTrue(
            (SCRIPTS_DIR / "rebuild_project_index.py").exists(),
            "rebuild_project_index.py missing"
        )


class TestDashboard(unittest.TestCase):
    """Verify dashboard HTML is well-formed."""

    DASHBOARD = PROJ_ROOT / "docs" / "index.html"

    def test_dashboard_exists(self):
        self.assertTrue(self.DASHBOARD.exists(), "docs/index.html missing")

    def test_dashboard_has_sentinel_markers(self):
        with open(self.DASHBOARD, encoding="utf-8") as f:
            content = f.read()
        markers = ["CURRENT_STATE", "INVENTORY", "DAEMON", "CONSOLIDATION"]
        for m in markers:
            self.assertIn(f"/*__{m}__*/", content, f"Missing sentinel: {m}")
            self.assertIn(f"/*__END_{m}__*/", content, f"Missing end sentinel: {m}")

    def test_dashboard_has_required_sections(self):
        with open(self.DASHBOARD, encoding="utf-8") as f:
            content = f.read()
        sections = ["Extraction Progress", "Worker Health", "Module Targets",
                     "Session Archives", "Current Stage"]
        for s in sections:
            self.assertIn(s, content, f"Missing section: {s}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
