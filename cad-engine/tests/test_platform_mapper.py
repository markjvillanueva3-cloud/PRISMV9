"""Tests for Cross-Platform Operation Mapper — CC-MS8."""

import json
import os
import tempfile
import shutil

import pytest

from src.platform_mapper import (
    PlatformMapper,
    MappingResult,
    AutoMapResult,
    DOMAINS,
    _similarity,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mapper():
    """Mapper loaded from real seed data."""
    m = PlatformMapper()
    m.load()
    return m


@pytest.fixture
def empty_mapper(tmp_path):
    """Mapper with no data directory."""
    return PlatformMapper(data_dir=str(tmp_path / "nonexistent"))


# ---------------------------------------------------------------------------
# TestPlatformMapperLoad
# ---------------------------------------------------------------------------

class TestPlatformMapperLoad:
    """Test data loading."""

    def test_load_returns_counts(self, mapper):
        counts = mapper.load()
        assert counts["cad_features"] >= 25
        assert counts["cam_strategies"] >= 20
        assert counts["drilling_cycles"] >= 10
        assert counts["turning_ops"] >= 10

    def test_total_mappings(self, mapper):
        assert mapper.total_mappings >= 70

    def test_stats(self, mapper):
        s = mapper.stats()
        assert s["cad_features"] >= 25
        assert s["cam_strategies"] >= 20
        assert s["cad_platforms"] >= 4
        assert s["cam_platforms"] >= 4
        assert s["cnc_controls"] >= 4

    def test_empty_load(self, empty_mapper):
        counts = empty_mapper.load()
        assert all(v == 0 for v in counts.values() if isinstance(v, int))
        assert empty_mapper.total_mappings == 0

    def test_get_platforms(self, mapper):
        cad_plats = mapper.get_platforms("cad_features")
        assert "solidworks" in cad_plats
        assert "fusion360" in cad_plats
        assert "cadquery" in cad_plats

        cam_plats = mapper.get_platforms("cam_strategies")
        assert "mastercam" in cam_plats
        assert "fusion_cam" in cam_plats


# ---------------------------------------------------------------------------
# TestCADFeatureLookup
# ---------------------------------------------------------------------------

class TestCADFeatureLookup:
    """Test CAD feature lookups."""

    def test_get_canonical_extrude(self, mapper):
        entry = mapper.get_canonical("extrude", "cad_features")
        assert entry is not None
        assert entry["canonical"] == "extrude"
        assert "solidworks" in entry["platforms"]
        assert "fusion360" in entry["platforms"]

    def test_map_extrude_to_freecad(self, mapper):
        term = mapper.map_to_platform("extrude", "freecad", "cad_features")
        assert term == "Pad"

    def test_map_fillet_to_cadquery(self, mapper):
        term = mapper.map_to_platform("fillet", "cadquery", "cad_features")
        assert term == "fillet"

    def test_resolve_boss_extrude(self, mapper):
        result = mapper.resolve_term("solidworks", "Boss-Extrude", "cad_features")
        assert result is not None
        assert result.canonical == "extrude"
        assert result.confidence == 1.0
        assert "fusion360" in result.target_mappings

    def test_resolve_pad_to_canonical(self, mapper):
        result = mapper.resolve_term("freecad", "Pad", "cad_features")
        assert result is not None
        assert result.canonical == "extrude"

    def test_resolve_pocket_freecad(self, mapper):
        result = mapper.resolve_term("freecad", "Pocket", "cad_features")
        assert result is not None
        assert result.canonical in ("cut_extrude", "pocket")

    def test_list_cad_canonical(self, mapper):
        names = mapper.list_canonical("cad_features")
        assert "extrude" in names
        assert "fillet" in names
        assert "chamfer" in names
        assert "hole" in names
        assert len(names) >= 25

    def test_list_cad_categories(self, mapper):
        cats = mapper.list_categories("cad_features")
        assert "additive" in cats
        assert "subtractive" in cats
        assert "modify" in cats

    def test_get_by_category_additive(self, mapper):
        additive = mapper.get_by_category("cad_features", "additive")
        canonicals = [e["canonical"] for e in additive]
        assert "extrude" in canonicals
        assert "revolve" in canonicals

    def test_nonexistent_canonical(self, mapper):
        assert mapper.get_canonical("nonexistent_op") is None

    def test_nonexistent_platform(self, mapper):
        assert mapper.map_to_platform("extrude", "fake_platform", "cad_features") is None


# ---------------------------------------------------------------------------
# TestCAMStrategyLookup
# ---------------------------------------------------------------------------

class TestCAMStrategyLookup:
    """Test CAM strategy lookups."""

    def test_get_canonical_adaptive(self, mapper):
        entry = mapper.get_canonical("adaptive_clearing", "cam_strategies")
        assert entry is not None
        assert entry["canonical"] == "adaptive_clearing"

    def test_map_adaptive_to_mastercam(self, mapper):
        term = mapper.map_to_platform("adaptive_clearing", "mastercam", "cam_strategies")
        assert term == "Dynamic Mill"

    def test_resolve_dynamic_mill(self, mapper):
        result = mapper.resolve_term("mastercam", "Dynamic Mill", "cam_strategies")
        assert result is not None
        assert result.canonical == "adaptive_clearing"
        assert "fusion_cam" in result.target_mappings
        assert result.target_mappings["fusion_cam"] == "Adaptive Clearing"

    def test_list_cam_categories(self, mapper):
        cats = mapper.list_categories("cam_strategies")
        assert "roughing" in cats
        assert "finishing" in cats
        assert "hole_making" in cats
        assert "turning" in cats

    def test_roughing_strategies(self, mapper):
        roughing = mapper.get_by_category("cam_strategies", "roughing")
        canonicals = [e["canonical"] for e in roughing]
        assert "adaptive_clearing" in canonicals
        assert "face_milling" in canonicals

    def test_finishing_strategies(self, mapper):
        finishing = mapper.get_by_category("cam_strategies", "finishing")
        canonicals = [e["canonical"] for e in finishing]
        assert "contour_finishing" in canonicals
        assert "parallel_finishing" in canonicals


# ---------------------------------------------------------------------------
# TestDrillingCycleLookup
# ---------------------------------------------------------------------------

class TestDrillingCycleLookup:
    """Test drilling cycle lookups."""

    def test_get_peck_drill(self, mapper):
        entry = mapper.get_canonical("peck_drill_full_retract", "drilling_cycles")
        assert entry is not None
        gcode = entry["gcode"]
        assert gcode["fanuc"]["code"] == "G83"
        assert gcode["haas"]["code"] == "G83"

    def test_map_tapping_to_siemens(self, mapper):
        term = mapper.map_to_platform("tapping_right", "siemens_840d", "drilling_cycles")
        assert term == "CYCLE84"

    def test_resolve_g84(self, mapper):
        result = mapper.resolve_term("fanuc", "G84", "drilling_cycles")
        assert result is not None
        assert result.canonical == "tapping_right"

    def test_list_drilling_canonical(self, mapper):
        names = mapper.list_canonical("drilling_cycles")
        assert "standard_drill" in names
        assert "peck_drill_full_retract" in names
        assert "tapping_right" in names
        assert "reaming" in names


# ---------------------------------------------------------------------------
# TestTurningOpsLookup
# ---------------------------------------------------------------------------

class TestTurningOpsLookup:
    """Test turning operation lookups."""

    def test_get_od_rough(self, mapper):
        entry = mapper.get_canonical("od_rough_cycle", "turning_ops")
        assert entry is not None
        gcode = entry["gcode"]
        assert gcode["fanuc_turning"]["code"] == "G71"

    def test_map_threading_to_siemens(self, mapper):
        term = mapper.map_to_platform("threading_cycle", "siemens_840d_turning", "turning_ops")
        assert term == "CYCLE97"

    def test_resolve_g76(self, mapper):
        result = mapper.resolve_term("fanuc_turning", "G76", "turning_ops")
        assert result is not None
        assert result.canonical == "threading_cycle"

    def test_list_turning_ops(self, mapper):
        names = mapper.list_canonical("turning_ops")
        assert "od_rough_cycle" in names
        assert "threading_cycle" in names
        assert "constant_surface_speed" in names
        assert len(names) >= 10


# ---------------------------------------------------------------------------
# TestAutoMapper
# ---------------------------------------------------------------------------

class TestAutoMapper:
    """Test fuzzy auto-mapping."""

    def test_exact_match(self, mapper):
        result = mapper.auto_map("Boss-Extrude")
        assert result is not None
        assert result.canonical == "extrude"
        assert result.confidence == 1.0

    def test_fuzzy_match_dynamic_milling(self, mapper):
        result = mapper.auto_map("Dynamic Milling")
        assert result is not None
        assert result.confidence >= 0.7

    def test_fuzzy_match_pocket(self, mapper):
        result = mapper.auto_map("Pocket Roughing")
        assert result is not None
        assert result.confidence >= 0.6

    def test_fuzzy_match_fillet(self, mapper):
        result = mapper.auto_map("Fillet/Round", domain="cad_features")
        assert result is not None
        assert result.canonical == "fillet"
        assert result.confidence >= 0.6

    def test_no_match_garbage(self, mapper):
        result = mapper.auto_map("xyzzy_nothing_matches_this")
        assert result is None

    def test_threshold_controls_match(self, mapper):
        # Very high threshold should reject fuzzy matches
        result = mapper.auto_map("Adaptive Clearing Rough", threshold=0.99)
        assert result is None or result.confidence >= 0.99

    def test_auto_map_returns_alternatives(self, mapper):
        result = mapper.auto_map("Milling", threshold=0.4)
        if result is not None and result.alternatives:
            for alt_name, alt_score in result.alternatives:
                assert isinstance(alt_name, str)
                assert 0.0 <= alt_score <= 1.0

    def test_domain_filter(self, mapper):
        result = mapper.auto_map("G71", domain="turning_ops")
        assert result is not None
        assert result.domain == "turning_ops"


# ---------------------------------------------------------------------------
# TestCrossReference
# ---------------------------------------------------------------------------

class TestCrossReference:
    """Test cross-reference tables."""

    def test_solidworks_to_fusion_cad(self, mapper):
        xref = mapper.cross_reference("solidworks", "fusion360", "cad_features")
        assert len(xref) >= 20
        canonicals = [x["canonical"] for x in xref]
        assert "extrude" in canonicals
        assert "fillet" in canonicals

    def test_mastercam_to_fusion_cam(self, mapper):
        xref = mapper.cross_reference("mastercam", "fusion_cam", "cam_strategies")
        assert len(xref) >= 10
        canonicals = [x["canonical"] for x in xref]
        assert "adaptive_clearing" in canonicals

    def test_fanuc_to_siemens_drilling(self, mapper):
        xref = mapper.cross_reference("fanuc", "siemens_840d", "drilling_cycles")
        assert len(xref) >= 8

    def test_cross_ref_has_description(self, mapper):
        xref = mapper.cross_reference("solidworks", "fusion360", "cad_features")
        for entry in xref:
            assert "canonical" in entry
            assert "source_term" in entry
            assert "target_term" in entry
            assert "description" in entry


# ---------------------------------------------------------------------------
# TestSeedDataIntegrity
# ---------------------------------------------------------------------------

class TestSeedDataIntegrity:
    """Validate seed data files."""

    def test_cad_features_minimum_count(self, mapper):
        assert len(mapper.list_canonical("cad_features")) >= 25

    def test_cam_strategies_minimum_count(self, mapper):
        assert len(mapper.list_canonical("cam_strategies")) >= 20

    def test_drilling_cycles_minimum_count(self, mapper):
        assert len(mapper.list_canonical("drilling_cycles")) >= 10

    def test_turning_ops_minimum_count(self, mapper):
        assert len(mapper.list_canonical("turning_ops")) >= 10

    def test_all_cad_features_have_platforms(self, mapper):
        for name in mapper.list_canonical("cad_features"):
            entry = mapper.get_canonical(name, "cad_features")
            assert "platforms" in entry, f"{name} missing platforms"
            assert len(entry["platforms"]) >= 3, f"{name} has fewer than 3 platforms"

    def test_all_cam_strategies_have_platforms(self, mapper):
        for name in mapper.list_canonical("cam_strategies"):
            entry = mapper.get_canonical(name, "cam_strategies")
            assert "platforms" in entry, f"{name} missing platforms"
            assert len(entry["platforms"]) >= 3, f"{name} has fewer than 3 platforms"

    def test_all_drilling_cycles_have_gcode(self, mapper):
        for name in mapper.list_canonical("drilling_cycles"):
            entry = mapper.get_canonical(name, "drilling_cycles")
            assert "gcode" in entry, f"{name} missing gcode"
            assert len(entry["gcode"]) >= 2, f"{name} has fewer than 2 controls"

    def test_all_turning_ops_have_gcode(self, mapper):
        for name in mapper.list_canonical("turning_ops"):
            entry = mapper.get_canonical(name, "turning_ops")
            assert "gcode" in entry, f"{name} missing gcode"
            assert len(entry["gcode"]) >= 2, f"{name} has fewer than 2 controls"

    def test_no_duplicate_canonical_names(self, mapper):
        for domain in DOMAINS:
            names = mapper.list_canonical(domain)
            assert len(names) == len(set(names)), f"Duplicates in {domain}"

    def test_all_canonical_have_description(self, mapper):
        for domain in DOMAINS:
            for name in mapper.list_canonical(domain):
                entry = mapper.get_canonical(name, domain)
                assert entry.get("description"), f"{name} in {domain} missing description"


# ---------------------------------------------------------------------------
# TestEdgeCases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    """Edge case tests."""

    def test_similarity_empty(self):
        assert _similarity("", "test") == 0.0
        assert _similarity("test", "") == 0.0
        assert _similarity("", "") == 0.0

    def test_similarity_identical(self):
        assert _similarity("extrude", "extrude") == 1.0

    def test_similarity_partial(self):
        s = _similarity("extrude", "extrusion")
        assert 0.5 < s < 1.0

    def test_resolve_nonexistent_platform(self, mapper):
        result = mapper.resolve_term("fake_platform", "Boss-Extrude")
        assert result is None

    def test_resolve_nonexistent_term(self, mapper):
        result = mapper.resolve_term("solidworks", "NonexistentFeature")
        assert result is None

    def test_cross_reference_nonexistent_domain(self, mapper):
        xref = mapper.cross_reference("solidworks", "fusion360", "nonexistent")
        assert xref == []

    def test_list_canonical_nonexistent_domain(self, mapper):
        names = mapper.list_canonical("nonexistent")
        assert names == []

    def test_list_categories_nonexistent_domain(self, mapper):
        cats = mapper.list_categories("nonexistent")
        assert cats == []
