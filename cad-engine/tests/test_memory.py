"""Tests for Memory System — CC-MS7.

Covers: MemoryIndex, MemoryWriter, MemoryReader, MemoryCompactor, MemoryBoot.
Exit conditions:
  - FTS5 search returns results in <100ms
  - Dedup correctly consolidates near-duplicate entries
  - Boot loads memory in <2 seconds
  - Boot manifest fits within <2000 tokens
  - Memory persists across process restarts
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from memory_index import MemoryIndex, MemoryEntry, DOMAINS
from memory_write import MemoryWriter, content_hash
from memory_read import MemoryReader, SearchResult, parse_nl_query
from memory_compact import MemoryCompactor, CompactionResult, _jaccard
from memory_boot import MemoryBoot, BootManifest


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def tmp_db(tmp_path):
    """Create a temporary database path."""
    return str(tmp_path / "test_knowledge.db")


@pytest.fixture
def index(tmp_db):
    """Open a fresh MemoryIndex."""
    idx = MemoryIndex(tmp_db)
    idx.open()
    yield idx
    idx.close()


@pytest.fixture
def sample_entry() -> MemoryEntry:
    return MemoryEntry(
        entry_id="test-001",
        domain="shop",
        category="cutting_practices",
        title="Aluminum Roughing Speeds",
        content="For 6061-T6 aluminum roughing, use 800-1200 SFM with 3-flute end mill.",
        tags=["aluminum", "roughing", "speeds"],
        materials=["aluminum", "6061-T6"],
        machines=["haas_vf2"],
        confidence=0.85,
        source_id="SP-0001",
        source_type="aggregated",
        created_at="2026-03-01T00:00:00Z",
        updated_at="2026-03-01T00:00:00Z",
    )


@pytest.fixture
def populated_index(index, sample_entry):
    """Index with several entries across domains."""
    entries = [
        sample_entry,
        MemoryEntry(
            entry_id="test-002", domain="shop", category="material_tips",
            title="Titanium Coolant Requirements",
            content="Titanium requires flood coolant. Never dry machine titanium due to fire risk.",
            tags=["titanium", "coolant", "safety"], materials=["titanium"],
            confidence=0.95, created_at="2026-03-01T00:00:00Z",
            updated_at="2026-03-01T00:00:00Z",
        ),
        MemoryEntry(
            entry_id="test-003", domain="shop", category="trouble_trees",
            title="Chatter Troubleshooting",
            content="Symptom: audible vibration and chatter marks. Cause: excessive depth of cut or wrong RPM.",
            tags=["chatter", "vibration"], materials=["steel"],
            confidence=0.75, created_at="2026-03-01T00:00:00Z",
            updated_at="2026-03-01T00:00:00Z",
        ),
        MemoryEntry(
            entry_id="test-004", domain="cam", category="strategy",
            title="Adaptive Clearing Strategy",
            content="Use adaptive clearing toolpath for roughing pockets in hardened steel.",
            tags=["adaptive", "roughing", "pocket"], materials=["steel"],
            confidence=0.80, created_at="2026-03-01T00:00:00Z",
            updated_at="2026-03-01T00:00:00Z",
        ),
        MemoryEntry(
            entry_id="test-005", domain="cad", category="drawing",
            title="GD&T Position Tolerance",
            content="Position tolerance controls the location of a feature relative to datums.",
            tags=["gdt", "tolerance", "position"],
            confidence=0.70, created_at="2026-03-01T00:00:00Z",
            updated_at="2026-03-01T00:00:00Z",
        ),
    ]
    for e in entries:
        index.upsert(e)
    return index


# ===========================================================================
# MemoryIndex Tests
# ===========================================================================

class TestMemoryIndex:
    def test_open_creates_db(self, tmp_db):
        idx = MemoryIndex(tmp_db)
        idx.open()
        assert os.path.exists(tmp_db)
        idx.close()

    def test_upsert_and_get(self, index, sample_entry):
        index.upsert(sample_entry)
        result = index.get("test-001")
        assert result is not None
        assert result.entry_id == "test-001"
        assert result.title == "Aluminum Roughing Speeds"
        assert result.confidence == 0.85

    def test_upsert_update_bumps_version(self, index, sample_entry):
        index.upsert(sample_entry)
        sample_entry.content = "Updated content"
        sample_entry.updated_at = "2026-03-02T00:00:00Z"
        index.upsert(sample_entry)
        result = index.get("test-001")
        assert result.version == 2
        assert "Updated" in result.content

    def test_version_history(self, index, sample_entry):
        index.upsert(sample_entry)
        sample_entry.content = "Version 2 content"
        index.upsert(sample_entry)
        history = index.get_history("test-001")
        assert len(history) == 1
        assert history[0]["version"] == 1

    def test_fts_search(self, populated_index):
        results = populated_index.search("aluminum roughing")
        assert len(results) >= 1
        assert any(r.entry_id == "test-001" for r in results)

    def test_fts_search_titanium(self, populated_index):
        results = populated_index.search("titanium coolant")
        assert len(results) >= 1
        assert any(r.entry_id == "test-002" for r in results)

    def test_search_with_domain_filter(self, populated_index):
        results = populated_index.search("roughing", domain="cam")
        assert all(r.domain == "cam" for r in results)

    def test_search_with_confidence_filter(self, populated_index):
        results = populated_index.search("*", min_confidence=0.9)
        assert all(r.confidence >= 0.9 for r in results)

    def test_search_with_material_filter(self, populated_index):
        results = populated_index.search("*", materials=["titanium"])
        assert all("titanium" in [m.lower() for m in r.materials] for r in results)

    def test_search_speed_under_100ms(self, populated_index):
        t0 = time.perf_counter()
        populated_index.search("aluminum machining speeds feeds")
        elapsed_ms = (time.perf_counter() - t0) * 1000
        assert elapsed_ms < 100, f"Search took {elapsed_ms:.1f}ms, expected <100ms"

    def test_count(self, populated_index):
        assert populated_index.count() == 5

    def test_count_by_domain(self, populated_index):
        assert populated_index.count(domain="shop") == 3
        assert populated_index.count(domain="cam") == 1
        assert populated_index.count(domain="cad") == 1

    def test_domain_counts(self, populated_index):
        counts = populated_index.domain_counts()
        assert counts["shop"] == 3
        assert counts["cam"] == 1

    def test_category_counts(self, populated_index):
        counts = populated_index.category_counts()
        assert "cutting_practices" in counts

    def test_delete(self, populated_index):
        assert populated_index.delete("test-001")
        assert populated_index.get("test-001") is None
        assert populated_index.count() == 4

    def test_archive(self, populated_index):
        assert populated_index.archive("test-001")
        assert populated_index.count() == 4  # archived not counted
        result = populated_index.get("test-001")
        assert result.archived

    def test_get_all(self, populated_index):
        entries = populated_index.get_all()
        assert len(entries) == 5

    def test_get_all_by_domain(self, populated_index):
        shop = populated_index.get_all(domain="shop")
        assert len(shop) == 3

    def test_bulk_upsert(self, index):
        entries = [
            MemoryEntry(entry_id=f"bulk-{i}", domain="shop", category="test",
                        title=f"Bulk entry {i}", content=f"Content {i}")
            for i in range(10)
        ]
        count = index.bulk_upsert(entries)
        assert count == 10
        assert index.count() == 10

    def test_domains_constant(self):
        assert "cad" in DOMAINS
        assert "cam" in DOMAINS
        assert "shop" in DOMAINS


# ===========================================================================
# MemoryEntry Tests
# ===========================================================================

class TestMemoryEntry:
    def test_to_dict(self, sample_entry):
        d = sample_entry.to_dict()
        assert d["entry_id"] == "test-001"
        assert d["domain"] == "shop"
        assert isinstance(d["tags"], list)

    def test_from_dict_round_trip(self, sample_entry):
        d = sample_entry.to_dict()
        restored = MemoryEntry.from_dict(d)
        assert restored.entry_id == sample_entry.entry_id
        assert restored.confidence == sample_entry.confidence
        assert restored.materials == sample_entry.materials


# ===========================================================================
# MemoryWriter Tests
# ===========================================================================

class TestMemoryWriter:
    def test_write_entry(self, index):
        writer = MemoryWriter(index)
        entry = writer.write_entry(
            entry_id="w-001", domain="shop", category="cutting_practices",
            title="Test Practice", content="Content here",
            tags=["test"], confidence=0.8,
        )
        assert entry.entry_id == "w-001"
        assert writer.written == 1

    def test_dedup_on_same_id(self, index):
        writer = MemoryWriter(index)
        writer.write_entry(
            entry_id="w-001", domain="shop", category="test",
            title="First", content="Content", confidence=0.5,
        )
        writer.write_entry(
            entry_id="w-001", domain="shop", category="test",
            title="First Again", content="Content", confidence=0.7,
        )
        assert writer.written == 1
        assert writer.deduped == 1
        result = index.get("w-001")
        assert result.confidence > 0.5  # boosted

    def test_ingest_practices(self, index, tmp_path):
        # Create a minimal practice_db
        practice_db = {
            "categories": {
                "cutting_practices": {
                    "practices": [{
                        "practice_id": "SP-0001",
                        "title": "Test Practice",
                        "description": "A test practice",
                        "steps": ["Step 1", "Step 2"],
                        "tips": [],
                        "warnings": ["Be careful"],
                        "applicable_materials": ["aluminum"],
                        "applicable_machines": [],
                        "consensus_confidence": 0.8,
                        "tags": ["test"],
                    }]
                }
            }
        }
        db_file = str(tmp_path / "practice_db.json")
        with open(db_file, "w") as f:
            json.dump(practice_db, f)

        writer = MemoryWriter(index)
        count = writer.ingest_practices(db_file)
        assert count == 1
        assert index.count() == 1

    def test_ingest_material_tips(self, index, tmp_path):
        tips_dir = str(tmp_path / "tips")
        os.makedirs(tips_dir)
        tip_data = {
            "material": "aluminum",
            "tips": [{
                "tip_id": "ALU-0001",
                "tip_text": "Use 3-flute for aluminum",
                "detail": "3-flute provides better chip evacuation",
                "tags": ["tooling"],
                "cross_ref_materials": [],
                "consensus_weight": 0.85,
            }]
        }
        with open(os.path.join(tips_dir, "aluminum.json"), "w") as f:
            json.dump(tip_data, f)

        writer = MemoryWriter(index)
        count = writer.ingest_material_tips(tips_dir)
        assert count == 1

    def test_ingest_trouble_trees(self, index, tmp_path):
        trees_dir = str(tmp_path / "trees")
        os.makedirs(trees_dir)
        tree_data = {
            "tree_id": "TT-TEST",
            "title": "Test Tree",
            "symptom": "Test symptom",
            "root": {
                "node_type": "symptom",
                "text": "Test symptom",
                "children": [{
                    "node_type": "cause",
                    "text": "Bad setup",
                    "children": [],
                }],
            },
            "material_context": ["steel"],
            "machine_context": [],
            "tags": ["test"],
        }
        with open(os.path.join(trees_dir, "test.json"), "w") as f:
            json.dump(tree_data, f)

        writer = MemoryWriter(index)
        count = writer.ingest_trouble_trees(trees_dir)
        assert count == 1

    def test_ingest_all(self, index, tmp_path):
        # Create all data dirs with minimal data
        practices_path = str(tmp_path / "practice_db.json")
        tips_dir = str(tmp_path / "material_tips")
        trees_dir = str(tmp_path / "trouble_trees")

        with open(practices_path, "w") as f:
            json.dump({"categories": {}}, f)
        os.makedirs(tips_dir)
        os.makedirs(trees_dir)

        writer = MemoryWriter(index)
        # Override paths - ingest with empty data
        counts = {
            "practices": writer.ingest_practices(practices_path),
            "material_tips": writer.ingest_material_tips(tips_dir),
            "trouble_trees": writer.ingest_trouble_trees(trees_dir),
        }
        assert all(v == 0 for v in counts.values())

    def test_content_hash(self):
        h1 = content_hash("Hello World")
        h2 = content_hash("hello   world")
        assert h1 == h2  # normalized
        h3 = content_hash("Different text")
        assert h1 != h3


# ===========================================================================
# MemoryReader Tests
# ===========================================================================

class TestMemoryReader:
    def test_search_returns_results(self, populated_index):
        reader = MemoryReader(populated_index)
        results = reader.search("aluminum roughing")
        assert len(results) >= 1
        assert all(isinstance(r, SearchResult) for r in results)

    def test_search_result_has_relevance(self, populated_index):
        reader = MemoryReader(populated_index)
        results = reader.search("titanium coolant")
        assert results[0].relevance > 0

    def test_search_result_has_snippet(self, populated_index):
        reader = MemoryReader(populated_index)
        # Use "adaptive clearing" which maps to CAM domain and matches test-004
        results = reader.search("adaptive clearing roughing")
        assert len(results) >= 1
        # All results should have a snippet (even if just content prefix)
        assert all(r.snippet for r in results)

    def test_search_by_material(self, populated_index):
        reader = MemoryReader(populated_index)
        results = reader.search_by_material("titanium")
        assert len(results) >= 1

    def test_search_by_domain(self, populated_index):
        reader = MemoryReader(populated_index)
        results = reader.search_by_domain("cam", "roughing")
        assert all(r.entry.domain == "cam" for r in results)

    def test_get_summary(self, populated_index):
        reader = MemoryReader(populated_index)
        summary = reader.get_summary()
        assert summary["total"] == 5
        assert "shop" in summary["by_domain"]

    def test_to_dict(self, populated_index):
        reader = MemoryReader(populated_index)
        results = reader.search("aluminum")
        if results:
            d = results[0].to_dict()
            assert "relevance" in d
            assert "snippet" in d
            assert "entry_id" in d


class TestNLQueryParser:
    def test_parse_domain_shop(self):
        result = parse_nl_query("shop floor tips for aluminum")
        assert result["domain"] == "shop"

    def test_parse_domain_cam(self):
        result = parse_nl_query("toolpath strategy for milling")
        assert result["domain"] == "cam"

    def test_parse_domain_cad(self):
        result = parse_nl_query("drawing tolerance GD&T")
        assert result["domain"] == "cad"

    def test_parse_material(self):
        result = parse_nl_query("cutting speeds for titanium")
        assert "titanium" in result["materials"]

    def test_parse_category(self):
        result = parse_nl_query("troubleshoot chatter problem")
        assert result["category"] == "troubleshooting"

    def test_parse_confidence(self):
        result = parse_nl_query("high confidence > 0.8 results")
        assert result["min_confidence"] == 0.8

    def test_parse_terms(self):
        result = parse_nl_query("aluminum roughing speeds")
        assert "aluminum" in result["terms"]
        assert "roughing" in result["terms"]


# ===========================================================================
# MemoryCompactor Tests
# ===========================================================================

class TestMemoryCompactor:
    def test_compact_no_dupes(self, populated_index):
        compactor = MemoryCompactor(populated_index)
        result = compactor.compact()
        assert isinstance(result, CompactionResult)
        assert result.merged == 0
        assert result.kept == 5

    def test_compact_merges_duplicates(self, index):
        # Add two similar entries
        index.upsert(MemoryEntry(
            entry_id="dup-001", domain="shop", category="tips",
            title="Use flood coolant for titanium machining",
            content="Always use flood coolant when machining titanium to prevent fire.",
            confidence=0.8,
        ))
        index.upsert(MemoryEntry(
            entry_id="dup-002", domain="shop", category="tips",
            title="Use flood coolant for titanium machining operations",
            content="Always use flood coolant when machining titanium to prevent fire risk.",
            confidence=0.7,
        ))

        compactor = MemoryCompactor(index)
        result = compactor.compact(similarity_threshold=0.70)
        assert result.merged >= 1

    def test_compact_archives_low_confidence(self, index):
        index.upsert(MemoryEntry(
            entry_id="low-001", domain="shop", category="tips",
            title="Uncertain tip", content="Maybe do this",
            confidence=0.1,
        ))
        compactor = MemoryCompactor(index)
        result = compactor.compact(archive_below_confidence=0.15)
        assert result.archived == 1

    def test_compact_dry_run(self, populated_index):
        compactor = MemoryCompactor(populated_index)
        result = compactor.compact(dry_run=True)
        assert populated_index.count() == 5  # unchanged

    def test_find_duplicates(self, index):
        index.upsert(MemoryEntry(
            entry_id="fd-001", domain="shop", category="tips",
            title="Same title here about cutting", content="Same content",
            confidence=0.8,
        ))
        index.upsert(MemoryEntry(
            entry_id="fd-002", domain="shop", category="tips",
            title="Same title here about cutting speeds", content="Same content text",
            confidence=0.7,
        ))
        compactor = MemoryCompactor(index)
        dupes = compactor.find_duplicates(threshold=0.5)
        assert len(dupes) >= 1
        assert dupes[0][2] > 0.5  # similarity score


class TestJaccard:
    def test_identical(self):
        assert _jaccard("hello world", "hello world") == 1.0

    def test_disjoint(self):
        assert _jaccard("hello", "goodbye") == 0.0

    def test_partial(self):
        score = _jaccard("aluminum roughing speeds", "aluminum roughing feeds")
        assert 0.3 < score < 0.8

    def test_empty(self):
        assert _jaccard("", "hello") == 0.0


# ===========================================================================
# MemoryBoot Tests
# ===========================================================================

class TestMemoryBoot:
    def test_boot_creates_index(self, tmp_path):
        db = str(tmp_path / "boot_test.db")
        manifest_path = str(tmp_path / "manifest.json")
        boot = MemoryBoot(db_path=db, manifest_path=manifest_path)
        manifest = boot.boot()
        assert boot.index is not None
        assert isinstance(manifest, BootManifest)
        assert manifest.total_entries == 0
        boot.shutdown()

    def test_boot_under_2_seconds(self, tmp_path):
        db = str(tmp_path / "speed_test.db")
        manifest_path = str(tmp_path / "manifest.json")
        boot = MemoryBoot(db_path=db, manifest_path=manifest_path)

        t0 = time.perf_counter()
        boot.boot()
        elapsed_ms = (time.perf_counter() - t0) * 1000

        assert elapsed_ms < 2000, f"Boot took {elapsed_ms:.1f}ms, expected <2000ms"
        boot.shutdown()

    def test_shutdown_saves_manifest(self, tmp_path):
        db = str(tmp_path / "save_test.db")
        manifest_path = str(tmp_path / "manifest.json")
        boot = MemoryBoot(db_path=db, manifest_path=manifest_path)
        boot.boot()

        # Add some data
        boot.index.upsert(MemoryEntry(
            entry_id="boot-001", domain="shop", category="test",
            title="Boot Test", content="Content",
            confidence=0.8,
            created_at="2026-03-01T00:00:00Z",
            updated_at="2026-03-01T00:00:00Z",
        ))

        path = boot.shutdown()
        assert os.path.exists(path)

        with open(path) as f:
            data = json.load(f)
        assert data["total_entries"] == 1

    def test_manifest_under_2000_tokens(self, tmp_path):
        db = str(tmp_path / "token_test.db")
        manifest_path = str(tmp_path / "manifest.json")
        boot = MemoryBoot(db_path=db, manifest_path=manifest_path)
        boot.boot()

        # Add 100 entries
        for i in range(100):
            boot.index.upsert(MemoryEntry(
                entry_id=f"tok-{i:04d}",
                domain=DOMAINS[i % 3],
                category="test",
                title=f"Entry {i} about machining topic {i}",
                content=f"Detailed content about entry {i} with specifics",
                confidence=0.5 + (i % 50) / 100,
                created_at="2026-03-01T00:00:00Z",
                updated_at="2026-03-01T00:00:00Z",
            ))

        manifest = boot._generate_manifest()
        tokens = manifest.token_estimate()
        assert tokens <= 2000, f"Manifest is {tokens} tokens, expected <=2000"
        boot.shutdown()

    def test_load_manifest_from_disk(self, tmp_path):
        db = str(tmp_path / "load_test.db")
        manifest_path = str(tmp_path / "manifest.json")
        boot = MemoryBoot(db_path=db, manifest_path=manifest_path)
        boot.boot()
        boot.shutdown()

        # Load without booting
        boot2 = MemoryBoot(db_path=db, manifest_path=manifest_path)
        data = boot2.load_manifest()
        assert data is not None
        assert "generated_at" in data

    def test_persistence_across_restart(self, tmp_path):
        """Memory persists across process restarts (open/close cycles)."""
        db = str(tmp_path / "persist_test.db")
        manifest_path = str(tmp_path / "manifest.json")

        # Session 1: write data
        boot1 = MemoryBoot(db_path=db, manifest_path=manifest_path)
        boot1.boot()
        boot1.index.upsert(MemoryEntry(
            entry_id="persist-001", domain="shop", category="test",
            title="Persistent Entry", content="This should survive restart",
            confidence=0.9,
        ))
        boot1.shutdown()

        # Session 2: verify data persists
        boot2 = MemoryBoot(db_path=db, manifest_path=manifest_path)
        boot2.boot()
        entry = boot2.index.get("persist-001")
        assert entry is not None
        assert entry.title == "Persistent Entry"
        assert entry.confidence == 0.9
        boot2.shutdown()


class TestBootManifest:
    def test_to_dict(self):
        m = BootManifest()
        m.generated_at = "2026-03-01T00:00:00Z"
        m.total_entries = 10
        d = m.to_dict()
        assert d["total_entries"] == 10

    def test_token_estimate(self):
        m = BootManifest()
        m.total_entries = 5
        tokens = m.token_estimate()
        assert tokens > 0
        assert tokens < 500  # empty manifest is small


# ===========================================================================
# Integration Tests
# ===========================================================================

class TestIntegration:
    def test_full_pipeline(self, tmp_path):
        """Full pipeline: write -> search -> compact -> boot."""
        db = str(tmp_path / "integration.db")
        manifest_path = str(tmp_path / "manifest.json")

        # 1. Create index and writer
        idx = MemoryIndex(db)
        idx.open()

        writer = MemoryWriter(idx)

        # 2. Write entries
        for i in range(20):
            writer.write_entry(
                entry_id=f"int-{i:04d}",
                domain=DOMAINS[i % 3],
                category="test",
                title=f"Integration test entry {i}",
                content=f"Detailed content about topic {i} for integration testing",
                tags=[f"tag{i % 5}"],
                materials=["aluminum"] if i % 2 == 0 else ["steel"],
                confidence=0.5 + (i % 10) / 20,
            )

        assert idx.count() == 20

        # 3. Search
        reader = MemoryReader(idx)
        results = reader.search("integration test")
        assert len(results) > 0

        # 4. Compact (should find no dupes in this case)
        compactor = MemoryCompactor(idx)
        comp_result = compactor.compact()
        assert comp_result.merged == 0

        # 5. Boot manifest
        boot = MemoryBoot(db_path=db, manifest_path=manifest_path)
        boot._index = idx  # reuse open index
        manifest = boot._generate_manifest()
        assert manifest.total_entries == 20
        assert manifest.token_estimate() <= 2000

        idx.close()

    def test_ingest_real_data(self, tmp_path):
        """Ingest from actual PRISM data if available."""
        db = str(tmp_path / "real_data.db")
        idx = MemoryIndex(db)
        idx.open()

        writer = MemoryWriter(idx)
        counts = writer.ingest_all()

        # At least practice_db should exist
        total = sum(counts.values())
        if total > 0:
            reader = MemoryReader(idx)
            summary = reader.get_summary()
            assert summary["total"] == total

            # Verify search works
            results = reader.search("*")
            assert len(results) > 0

        idx.close()
