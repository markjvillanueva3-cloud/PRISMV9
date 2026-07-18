"""Tests for CC-MS5: CAM Strategy Learning Engine.

Covers:
- strategy_aggregate: StrategyDB, ingestion, consensus computation, querying
- strategy_recommend: validation, recommendation ranking
- tool_select_kb: rationale storage, ingestion, querying, recommendations
- op_sequence: sequence extraction, sub-sequences, next-op suggestions
"""

import json
import math
import os
import tempfile

import pytest

from src.strategy_aggregate import (
    ParameterStats,
    SourceRecord,
    StrategyDB,
    StrategyRecord,
    _compute_weighted_stats,
)
from src.strategy_recommend import (
    ValidationResult,
    recommend,
    validate_strategy,
)
from src.tool_select_kb import ToolSelectionKB
from src.op_sequence import SequenceDB, _categorize_sequence


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def tmp_dir():
    """Temporary directory for test DB files."""
    with tempfile.TemporaryDirectory() as d:
        yield d


@pytest.fixture
def strategy_db(tmp_dir):
    """Empty strategy DB in temp dir."""
    path = os.path.join(tmp_dir, "strategy_db.json")
    return StrategyDB(db_path=path)


@pytest.fixture
def tool_kb(tmp_dir):
    """Empty tool selection KB in temp dir."""
    path = os.path.join(tmp_dir, "tool_rationale_kb.json")
    return ToolSelectionKB(kb_path=path)


@pytest.fixture
def sequence_db(tmp_dir):
    """Empty sequence DB in temp dir."""
    path = os.path.join(tmp_dir, "operation_sequences.json")
    return SequenceDB(db_path=path)


@pytest.fixture
def sample_cam_extraction():
    """Sample CAM extraction data matching knowledge_schema_v2."""
    return {
        "strategies": [
            {
                "id": "cam-001",
                "name": "Adaptive roughing",
                "operation_type": "adaptive",
                "sequence_order": 1,
                "tool": {
                    "type": "end_mill",
                    "diameter_mm": 12.0,
                    "flutes": 3,
                    "material": "carbide",
                    "coating": "TiAlN",
                    "description": "3-flute carbide end mill 12mm",
                },
                "cutting_parameters": [
                    {"name": "spindle_rpm", "value": 10000, "unit": "rpm"},
                    {"name": "feed_rate", "value": 5000, "unit": "mm/min"},
                    {"name": "depth_of_cut", "value": 12.0, "unit": "mm"},
                    {"name": "stepover", "value": 2.4, "unit": "mm"},
                    {"name": "surface_speed", "value": 377, "unit": "m/min"},
                ],
                "strategy_rationale": "Adaptive clearing for aluminum with 3-flute for better chip evacuation",
                "target_features": ["pocket"],
                "workholding": "vise",
                "coolant": "mist",
                "provenance": {
                    "source_type": "transcript",
                    "confidence": 0.85,
                    "timestamp_seconds": 120.0,
                    "transcript_span": "We're going to use adaptive clearing here...",
                },
                "cross_links": [],
            },
            {
                "id": "cam-002",
                "name": "2D contour finishing",
                "operation_type": "contour",
                "sequence_order": 2,
                "tool": {
                    "type": "end_mill",
                    "diameter_mm": 12.0,
                    "flutes": 3,
                    "material": "carbide",
                    "coating": "TiAlN",
                    "description": "Same end mill for finishing pass",
                },
                "cutting_parameters": [
                    {"name": "spindle_rpm", "value": 12000, "unit": "rpm"},
                    {"name": "feed_rate", "value": 3000, "unit": "mm/min"},
                    {"name": "depth_of_cut", "value": 12.0, "unit": "mm"},
                    {"name": "stepover", "value": 0.3, "unit": "mm"},
                    {"name": "surface_speed", "value": 452, "unit": "m/min"},
                ],
                "strategy_rationale": "Light finishing pass to get final dimension and surface finish",
                "target_features": ["wall"],
                "workholding": "vise",
                "coolant": "mist",
                "provenance": {
                    "source_type": "transcript",
                    "confidence": 0.80,
                    "timestamp_seconds": 240.0,
                    "transcript_span": "Now a light finishing pass...",
                },
                "cross_links": [],
            },
            {
                "id": "cam-003",
                "name": "Drilling holes",
                "operation_type": "drilling",
                "sequence_order": 3,
                "tool": {
                    "type": "drill",
                    "diameter_mm": 8.5,
                    "flutes": 2,
                    "material": "carbide",
                    "coating": "TiN",
                    "description": "8.5mm carbide drill",
                },
                "cutting_parameters": [
                    {"name": "spindle_rpm", "value": 6000, "unit": "rpm"},
                    {"name": "feed_rate", "value": 1200, "unit": "mm/min"},
                    {"name": "depth_of_cut", "value": 25.0, "unit": "mm"},
                ],
                "strategy_rationale": "Drill holes after milling to avoid chip interference",
                "target_features": ["hole"],
                "workholding": "vise",
                "coolant": "flood",
                "provenance": {
                    "source_type": "transcript",
                    "confidence": 0.75,
                    "timestamp_seconds": 360.0,
                },
                "cross_links": [],
            },
        ],
        "machining_summary": "Aluminum pocket part with adaptive roughing, contour finish, and drilled holes",
        "tool_list": [
            {"number": 1, "type": "end_mill", "diameter_mm": 12.0, "description": "3-flute carbide"},
            {"number": 2, "type": "drill", "diameter_mm": 8.5, "description": "carbide drill"},
        ],
    }


@pytest.fixture
def sample_cam_extraction_2():
    """Second CAM extraction for testing aggregation across videos."""
    return {
        "strategies": [
            {
                "id": "cam-001",
                "name": "Adaptive roughing - video 2",
                "operation_type": "adaptive",
                "sequence_order": 1,
                "tool": {
                    "type": "end_mill",
                    "diameter_mm": 12.7,
                    "flutes": 3,
                    "material": "carbide",
                    "coating": "AlCrN",
                },
                "cutting_parameters": [
                    {"name": "spindle_rpm", "value": 9500, "unit": "rpm"},
                    {"name": "feed_rate", "value": 4800, "unit": "mm/min"},
                    {"name": "depth_of_cut", "value": 10.0, "unit": "mm"},
                    {"name": "stepover", "value": 2.5, "unit": "mm"},
                    {"name": "surface_speed", "value": 379, "unit": "m/min"},
                ],
                "strategy_rationale": "High speed adaptive with 3-flute end mill for aluminum",
                "provenance": {"source_type": "transcript", "confidence": 0.90},
            },
        ],
    }


# ===========================================================================
# Tests: _compute_weighted_stats
# ===========================================================================


class TestWeightedStats:
    def test_single_value(self):
        stats = _compute_weighted_stats([100.0], [1.0], "rpm", "rpm")
        assert stats.mean == 100.0
        assert stats.min_val == 100.0
        assert stats.max_val == 100.0
        assert stats.stddev == 0.0
        assert stats.sample_count == 1

    def test_equal_weights(self):
        stats = _compute_weighted_stats([100.0, 200.0], [1.0, 1.0], "rpm", "rpm")
        assert stats.mean == 150.0
        assert stats.min_val == 100.0
        assert stats.max_val == 200.0
        assert stats.sample_count == 2

    def test_unequal_weights(self):
        stats = _compute_weighted_stats([100.0, 200.0], [3.0, 1.0], "rpm", "rpm")
        # Weighted mean: (100*3 + 200*1) / 4 = 125
        assert stats.mean == 125.0

    def test_empty_values(self):
        stats = _compute_weighted_stats([], [], "rpm", "rpm")
        assert stats.mean == 0.0
        assert stats.sample_count == 0

    def test_stddev_calculation(self):
        stats = _compute_weighted_stats([10.0, 20.0, 30.0], [1.0, 1.0, 1.0], "x", "mm")
        assert stats.mean == pytest.approx(20.0)
        expected_var = ((10 - 20) ** 2 + (20 - 20) ** 2 + (30 - 20) ** 2) / 3
        assert stats.stddev == pytest.approx(math.sqrt(expected_var))


# ===========================================================================
# Tests: SourceRecord
# ===========================================================================


class TestSourceRecord:
    def test_authority_weight_default(self):
        src = SourceRecord(video_id="v1", confidence=0.5)
        weight = src.authority_weight()
        assert 0.0 < weight < 1.0

    def test_authority_weight_high(self):
        src = SourceRecord(
            video_id="v1",
            channel_subscribers=1_000_000,
            views=500_000,
            likes=25_000,
            confidence=0.95,
        )
        weight = src.authority_weight()
        assert weight > 0.8

    def test_authority_weight_low(self):
        src = SourceRecord(video_id="v1", confidence=0.1)
        weight = src.authority_weight()
        assert weight < 0.3


# ===========================================================================
# Tests: StrategyDB
# ===========================================================================


class TestStrategyDB:
    def test_empty_db(self, strategy_db):
        assert len(strategy_db.strategies) == 0
        summary = strategy_db.summary()
        assert summary["total_strategies"] == 0

    def test_ingest_single_video(self, strategy_db, sample_cam_extraction):
        ids = strategy_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            video_title="Aluminum Pocket Machining",
            material_class="aluminum",
            machine_type="3-axis_vertical",
        )
        assert len(ids) == 3  # 3 strategies

    def test_ingest_creates_records(self, strategy_db, sample_cam_extraction):
        strategy_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        assert len(strategy_db.strategies) == 3
        summary = strategy_db.summary()
        assert "aluminum" in summary["materials"]
        assert "adaptive" in summary["operation_types"]

    def test_consensus_params(self, strategy_db, sample_cam_extraction):
        strategy_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        # Find the adaptive strategy
        results = strategy_db.query(operation_type="adaptive")
        assert len(results) == 1
        record = results[0]
        assert record.source_count == 1
        # Check consensus has spindle_rpm
        param_names = {p.name for p in record.consensus_params}
        assert "spindle_rpm" in param_names

    def test_aggregation_across_videos(
        self, strategy_db, sample_cam_extraction, sample_cam_extraction_2
    ):
        strategy_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        strategy_db.ingest_extraction(
            sample_cam_extraction_2,
            video_id="vid-002",
            material_class="aluminum",
        )
        results = strategy_db.query(operation_type="adaptive", material_class="aluminum")
        assert len(results) == 1
        record = results[0]
        assert record.source_count == 2
        # Check consensus is averaged
        rpm_stats = next((p for p in record.consensus_params if p.name == "spindle_rpm"), None)
        assert rpm_stats is not None
        assert rpm_stats.sample_count == 2
        assert rpm_stats.min_val == 9500
        assert rpm_stats.max_val == 10000

    def test_query_filters(self, strategy_db, sample_cam_extraction):
        strategy_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        # Filter by operation type
        assert len(strategy_db.query(operation_type="adaptive")) == 1
        assert len(strategy_db.query(operation_type="contour")) == 1
        assert len(strategy_db.query(operation_type="pocket_2d")) == 0
        # Filter by material
        assert len(strategy_db.query(material_class="aluminum")) == 3
        assert len(strategy_db.query(material_class="steel")) == 0

    def test_save_and_reload(self, strategy_db, sample_cam_extraction):
        strategy_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        strategy_db.save()

        # Reload
        db2 = StrategyDB(db_path=strategy_db.db_path)
        assert len(db2.strategies) == 3
        results = db2.query(operation_type="adaptive")
        assert len(results) == 1
        assert results[0].source_count == 1

    def test_get_materials(self, strategy_db, sample_cam_extraction):
        strategy_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        assert "aluminum" in strategy_db.get_materials()

    def test_get_operation_types(self, strategy_db, sample_cam_extraction):
        strategy_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        ops = strategy_db.get_operation_types()
        assert "adaptive" in ops
        assert "contour" in ops
        assert "drilling" in ops


# ===========================================================================
# Tests: validate_strategy
# ===========================================================================


class TestValidateStrategy:
    def test_valid_aluminum_adaptive(self):
        record = StrategyRecord(
            strategy_id="test-001",
            operation_type="adaptive",
            material_class="aluminum",
            tool_type="end_mill",
            tool_diameter_mm=12.0,
            tool_flutes=3,
            consensus_params=[
                ParameterStats("surface_speed", "m/min", 377, 377, 377, 0, 1),
                ParameterStats("spindle_rpm", "rpm", 10000, 10000, 10000, 0, 1),
                ParameterStats("feed_rate", "mm/min", 5000, 5000, 5000, 0, 1),
                ParameterStats("depth_of_cut", "mm", 12.0, 12.0, 12.0, 0, 1),
            ],
        )
        result = validate_strategy(record)
        assert result.score > 0.5
        assert result.fail_count == 0

    def test_invalid_surface_speed(self):
        record = StrategyRecord(
            strategy_id="test-002",
            operation_type="adaptive",
            material_class="titanium",
            tool_type="end_mill",
            consensus_params=[
                ParameterStats("surface_speed", "m/min", 500, 500, 500, 0, 1),
            ],
        )
        result = validate_strategy(record)
        # 500 m/min is way too fast for titanium (range: 20-80)
        assert any(c.status == "fail" for c in result.checks)

    def test_no_params_no_fail(self):
        record = StrategyRecord(
            strategy_id="test-003",
            operation_type="adaptive",
            material_class="aluminum",
        )
        result = validate_strategy(record)
        assert result.fail_count == 0

    def test_unknown_material_skips_vc_check(self):
        record = StrategyRecord(
            strategy_id="test-004",
            operation_type="adaptive",
            material_class="exotic_alloy",
            consensus_params=[
                ParameterStats("surface_speed", "m/min", 100, 100, 100, 0, 1),
            ],
        )
        result = validate_strategy(record)
        # Unknown material has no range -> no Vc check
        assert len(result.checks) == 0


# ===========================================================================
# Tests: recommend
# ===========================================================================


class TestRecommend:
    def test_recommend_from_populated_db(self, strategy_db, sample_cam_extraction):
        strategy_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
            machine_type="3-axis_vertical",
        )
        recs = recommend(
            strategy_db,
            operation_type="adaptive",
            material_class="aluminum",
        )
        assert len(recs) >= 1
        assert recs[0].rank == 1
        assert recs[0].strategy.operation_type == "adaptive"
        assert recs[0].combined_score > 0

    def test_recommend_empty_db(self, strategy_db):
        recs = recommend(strategy_db, operation_type="adaptive")
        assert recs == []

    def test_recommend_respects_max_results(self, strategy_db, sample_cam_extraction):
        strategy_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        recs = recommend(strategy_db, max_results=1)
        assert len(recs) <= 1

    def test_recommend_ranking(self, strategy_db, sample_cam_extraction, sample_cam_extraction_2):
        strategy_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        strategy_db.ingest_extraction(
            sample_cam_extraction_2,
            video_id="vid-002",
            material_class="aluminum",
        )
        recs = recommend(
            strategy_db,
            operation_type="adaptive",
            material_class="aluminum",
        )
        # The adaptive strategy with 2 sources should rank highest
        assert len(recs) >= 1
        assert recs[0].strategy.source_count >= 1

    def test_recommend_to_dict(self, strategy_db, sample_cam_extraction):
        strategy_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        recs = recommend(strategy_db, operation_type="adaptive")
        d = recs[0].to_dict()
        assert "rank" in d
        assert "strategy_id" in d
        assert "validation" in d
        assert "combined_score" in d


# ===========================================================================
# Tests: ToolSelectionKB
# ===========================================================================


class TestToolSelectionKB:
    def test_empty_kb(self, tool_kb):
        assert len(tool_kb.entries) == 0

    def test_add_rationale(self, tool_kb):
        rid = tool_kb.add_rationale(
            material_class="aluminum",
            operation_type="adaptive",
            tool_type="end_mill",
            tool_attribute="flutes",
            attribute_value="3",
            rationale="3-flute for aluminum: better chip evacuation, prevents re-cutting",
            confidence=0.85,
            video_id="vid-001",
            channel="CNC Kitchen",
        )
        assert rid.startswith("tr-")
        assert len(tool_kb.entries) == 1

    def test_dedup_same_rationale(self, tool_kb):
        tool_kb.add_rationale(
            material_class="aluminum",
            operation_type="adaptive",
            tool_type="end_mill",
            tool_attribute="flutes",
            attribute_value="3",
            rationale="First rationale",
            video_id="vid-001",
        )
        tool_kb.add_rationale(
            material_class="aluminum",
            operation_type="adaptive",
            tool_type="end_mill",
            tool_attribute="flutes",
            attribute_value="3",
            rationale="Updated rationale that is longer than the first one given here",
            video_id="vid-002",
        )
        # Should merge, not duplicate
        assert len(tool_kb.entries) == 1
        entry = list(tool_kb.entries.values())[0]
        assert entry.source_count == 2

    def test_ingest_from_strategy(self, tool_kb, sample_cam_extraction):
        strat = sample_cam_extraction["strategies"][0]
        ids = tool_kb.ingest_from_strategy(
            strat,
            material_class="aluminum",
            video_id="vid-001",
        )
        assert len(ids) >= 2  # at least flutes + coating

    def test_query(self, tool_kb):
        tool_kb.add_rationale("aluminum", "adaptive", "end_mill", "flutes", "3",
                              "3-flute for aluminum", confidence=0.9)
        tool_kb.add_rationale("steel", "adaptive", "end_mill", "flutes", "4",
                              "4-flute for steel", confidence=0.85)

        results = tool_kb.query(material_class="aluminum")
        assert len(results) == 1
        assert results[0].attribute_value == "3"

    def test_recommend_tool(self, tool_kb):
        tool_kb.add_rationale("aluminum", "adaptive", "end_mill", "flutes", "3",
                              "Chip evacuation", confidence=0.9)
        tool_kb.add_rationale("aluminum", "adaptive", "end_mill", "coating", "TiAlN",
                              "Heat resistance", confidence=0.85)

        recs = tool_kb.recommend_tool("aluminum", "adaptive")
        assert len(recs) == 1
        assert recs[0].tool_type == "end_mill"
        assert "flutes" in recs[0].attributes
        assert "coating" in recs[0].attributes

    def test_save_and_reload(self, tool_kb, tmp_dir):
        tool_kb.add_rationale("aluminum", "adaptive", "end_mill", "flutes", "3",
                              "3-flute for aluminum", confidence=0.9, video_id="v1")
        tool_kb.save()

        kb2 = ToolSelectionKB(kb_path=tool_kb.kb_path)
        assert len(kb2.entries) == 1

    def test_summary(self, tool_kb):
        tool_kb.add_rationale("aluminum", "adaptive", "end_mill", "flutes", "3", "test")
        s = tool_kb.summary()
        assert s["total_entries"] == 1
        assert "aluminum" in s["materials"]


# ===========================================================================
# Tests: SequenceDB
# ===========================================================================


class TestSequenceDB:
    def test_empty_db(self, sequence_db):
        assert len(sequence_db.patterns) == 0

    def test_ingest_extraction(self, sequence_db, sample_cam_extraction):
        ids = sequence_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        assert len(ids) >= 1
        # Should have the full sequence + sub-sequences
        assert len(sequence_db.patterns) >= 3  # full + 2-windows + 3-window

    def test_full_sequence_captured(self, sequence_db, sample_cam_extraction):
        sequence_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        # Full sequence: adaptive->contour->drilling
        full = sequence_db.query(min_steps=3)
        assert len(full) >= 1
        assert full[0].steps[0].operation_type == "adaptive"
        assert full[0].steps[1].operation_type == "contour"
        assert full[0].steps[2].operation_type == "drilling"

    def test_sub_sequences_extracted(self, sequence_db, sample_cam_extraction):
        sequence_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        # Should have 2-step sub-sequences
        two_step = sequence_db.query(min_steps=2, max_steps=2)
        assert len(two_step) >= 1

    def test_frequency_increases(self, sequence_db, sample_cam_extraction):
        sequence_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        sequence_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-002",
            material_class="aluminum",
        )
        full = sequence_db.query(min_steps=3)
        assert len(full) >= 1
        assert full[0].frequency >= 2

    def test_tool_change_detection(self, sequence_db, sample_cam_extraction):
        sequence_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        full = sequence_db.query(min_steps=3)
        assert len(full) >= 1
        pattern = full[0]
        # Tool changes from end_mill to drill at step 3
        assert pattern.tool_change_count >= 1

    def test_categorize_sequence(self):
        assert _categorize_sequence(["adaptive", "contour"]) in ("pocket_sequence", "roughing_sequence")
        assert _categorize_sequence(["drilling", "tapping"]) == "hole_sequence"
        assert _categorize_sequence(["turning_rough", "turning_finish"]) == "turning_sequence"
        assert _categorize_sequence(["roughing_3d", "finishing_3d"]) == "surface_sequence"

    def test_suggest_next_operation(self, sequence_db, sample_cam_extraction):
        sequence_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        suggestions = sequence_db.suggest_next_operation(["adaptive"])
        # After adaptive, contour should be suggested
        assert len(suggestions) >= 1
        op_names = [s[0] for s in suggestions]
        assert "contour" in op_names

    def test_suggest_no_match(self, sequence_db):
        suggestions = sequence_db.suggest_next_operation(["unknown_op"])
        assert suggestions == []

    def test_suggest_empty_input(self, sequence_db):
        suggestions = sequence_db.suggest_next_operation([])
        assert suggestions == []

    def test_query_by_category(self, sequence_db, sample_cam_extraction):
        sequence_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        # Query specific categories
        results = sequence_db.query(category="hole_sequence")
        # May or may not have hole sequences depending on categorization
        assert isinstance(results, list)

    def test_save_and_reload(self, sequence_db, sample_cam_extraction):
        sequence_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        sequence_db.save()

        db2 = SequenceDB(db_path=sequence_db.db_path)
        assert len(db2.patterns) == len(sequence_db.patterns)

    def test_summary(self, sequence_db, sample_cam_extraction):
        sequence_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
        )
        s = sequence_db.summary()
        assert s["total_patterns"] > 0

    def test_single_strategy_no_sequence(self, sequence_db):
        """A single strategy should not create a sequence."""
        cam_data = {
            "strategies": [
                {
                    "id": "cam-001",
                    "operation_type": "adaptive",
                    "sequence_order": 1,
                    "tool": {"type": "end_mill"},
                    "cutting_parameters": [],
                    "provenance": {"confidence": 0.8},
                },
            ],
        }
        ids = sequence_db.ingest_extraction(cam_data, video_id="vid-001")
        assert ids == []


# ===========================================================================
# Tests: Integration (all modules together)
# ===========================================================================


class TestIntegration:
    def test_full_pipeline(self, strategy_db, tool_kb, sequence_db, sample_cam_extraction):
        """Test the full ingestion pipeline across all modules."""
        video_id = "vid-001"
        material = "aluminum"

        # 1. Ingest into strategy DB
        strat_ids = strategy_db.ingest_extraction(
            sample_cam_extraction,
            video_id=video_id,
            material_class=material,
        )
        assert len(strat_ids) == 3

        # 2. Ingest tool rationale
        for strat in sample_cam_extraction["strategies"]:
            tool_kb.ingest_from_strategy(strat, material_class=material, video_id=video_id)
        assert len(tool_kb.entries) >= 3

        # 3. Ingest sequences
        seq_ids = sequence_db.ingest_extraction(
            sample_cam_extraction,
            video_id=video_id,
            material_class=material,
        )
        assert len(seq_ids) >= 1

        # 4. Get recommendations
        recs = recommend(strategy_db, operation_type="adaptive", material_class=material)
        assert len(recs) >= 1
        assert recs[0].validation.fail_count == 0

        # 5. Get tool rationale
        tool_recs = tool_kb.recommend_tool(material, "adaptive")
        assert len(tool_recs) >= 1

        # 6. Get sequence suggestions
        suggestions = sequence_db.suggest_next_operation(["adaptive"], material_class=material)
        assert len(suggestions) >= 1

    def test_multi_video_aggregation(
        self, strategy_db, tool_kb, sample_cam_extraction, sample_cam_extraction_2
    ):
        """Test aggregation across multiple video sources."""
        strategy_db.ingest_extraction(
            sample_cam_extraction,
            video_id="vid-001",
            material_class="aluminum",
            channel="Channel A",
        )
        strategy_db.ingest_extraction(
            sample_cam_extraction_2,
            video_id="vid-002",
            material_class="aluminum",
            channel="Channel B",
        )

        # Should have consensus from 2 sources for adaptive
        results = strategy_db.query(operation_type="adaptive", material_class="aluminum")
        assert len(results) == 1
        assert results[0].source_count == 2

        # Consensus RPM should be between the two values
        rpm = next((p for p in results[0].consensus_params if p.name == "spindle_rpm"), None)
        assert rpm is not None
        assert 9500 <= rpm.mean <= 10000

    def test_persistence_roundtrip(
        self, tmp_dir, sample_cam_extraction
    ):
        """Test save/load for all three databases."""
        db_path = os.path.join(tmp_dir, "strat.json")
        kb_path = os.path.join(tmp_dir, "kb.json")
        seq_path = os.path.join(tmp_dir, "seq.json")

        # Create and populate
        db = StrategyDB(db_path=db_path)
        kb = ToolSelectionKB(kb_path=kb_path)
        seq = SequenceDB(db_path=seq_path)

        db.ingest_extraction(sample_cam_extraction, video_id="v1", material_class="aluminum")
        for s in sample_cam_extraction["strategies"]:
            kb.ingest_from_strategy(s, material_class="aluminum", video_id="v1")
        seq.ingest_extraction(sample_cam_extraction, video_id="v1", material_class="aluminum")

        # Save
        db.save()
        kb.save()
        seq.save()

        # Verify files exist
        assert os.path.exists(db_path)
        assert os.path.exists(kb_path)
        assert os.path.exists(seq_path)

        # Reload and verify
        db2 = StrategyDB(db_path=db_path)
        kb2 = ToolSelectionKB(kb_path=kb_path)
        seq2 = SequenceDB(db_path=seq_path)

        assert len(db2.strategies) == len(db.strategies)
        assert len(kb2.entries) == len(kb.entries)
        assert len(seq2.patterns) == len(seq.patterns)
