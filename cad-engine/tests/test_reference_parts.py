"""Tests for 10 reference parts — creation, validation, and export."""

import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from reference_parts import REFERENCE_PARTS, build_all
from geo_validator import validate_geometry
from cad_export import export_step, export_stl


class TestReferencePartCreation:
    """Each reference part must create valid geometry."""

    @pytest.mark.parametrize("name,factory", list(REFERENCE_PARTS.items()))
    def test_part_creates_solid(self, name, factory):
        """Part factory returns a CadQuery Workplane with positive volume."""
        solid = factory()
        vol = solid.val().Volume()
        assert vol > 0, f"{name} has non-positive volume: {vol}"

    @pytest.mark.parametrize("name,factory", list(REFERENCE_PARTS.items()))
    def test_part_passes_validation(self, name, factory):
        """Each part passes full geometry validation."""
        solid = factory()
        report = validate_geometry(solid, check_thickness=False)
        assert report.is_valid, (
            f"{name} failed validation: "
            + "; ".join(f.message for f in report.findings if not f.passed)
        )
        assert report.is_manifold, f"{name} is not manifold"
        assert report.is_watertight, f"{name} is not watertight"

    def test_build_all_returns_10_parts(self):
        """build_all() produces exactly 10 named parts."""
        parts = build_all()
        assert len(parts) == 10
        assert set(parts.keys()) == set(REFERENCE_PARTS.keys())


class TestReferencePartExport:
    """Each reference part must export to STEP and STL."""

    @pytest.mark.parametrize("name,factory", list(REFERENCE_PARTS.items()))
    def test_export_step(self, name, factory, exports_dir):
        """Part exports to valid STEP file."""
        solid = factory()
        path = os.path.join(exports_dir, f"{name}.step")
        result = export_step(solid, path)
        assert result.success
        assert result.file_size_bytes > 0
        assert os.path.exists(path)

    @pytest.mark.parametrize("name,factory", list(REFERENCE_PARTS.items()))
    def test_export_stl(self, name, factory, exports_dir):
        """Part exports to valid STL file."""
        solid = factory()
        path = os.path.join(exports_dir, f"{name}.stl")
        result = export_stl(solid, path)
        assert result.success
        assert result.file_size_bytes > 0
        assert os.path.exists(path)


class TestReferencePartGeometry:
    """Spot-check known geometry properties."""

    def test_cube_volume(self):
        """25mm cube = 15625 mm³."""
        vol = REFERENCE_PARTS["cube"]().val().Volume()
        assert abs(vol - 15625.0) < 0.1

    def test_spacer_has_hole(self):
        """Spacer volume < solid cylinder volume (has bore)."""
        spacer_vol = REFERENCE_PARTS["spacer"]().val().Volume()
        # Solid cylinder: pi * 10^2 * 8 = 2513.3
        assert spacer_vol < 2513.3
        # With 5mm bore: pi * (10^2 - 5^2) * 8 = 1884.96
        assert abs(spacer_vol - 1884.96) < 1.0

    def test_shaft_collar_is_annular(self):
        """Shaft collar has less volume than solid cylinder."""
        collar_vol = REFERENCE_PARTS["shaft_collar"]().val().Volume()
        # Solid: pi * 15^2 * 12 = 8482.3
        assert collar_vol < 8482.3
        assert collar_vol > 0
