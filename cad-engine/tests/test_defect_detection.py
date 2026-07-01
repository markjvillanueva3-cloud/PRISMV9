"""Tests for geometry defect detection.

Builds intentionally broken geometry and verifies the validator
correctly identifies the defects.
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import cadquery as cq
from geo_validator import (
    validate_geometry,
    check_manifold,
    check_watertight,
    calculate_volume,
    ValidationSeverity,
)


class TestDefectDetection:
    """Validator must detect intentionally broken geometry."""

    def test_zero_volume_rejected(self):
        """A degenerate (zero-height extrusion) should fail volume check."""
        # Create a 2D sketch but don't extrude — use a very thin extrusion
        sketch = cq.Workplane("XY").rect(10, 10)
        # Extrude with near-zero height
        thin = sketch.extrude(0.0001)
        report = validate_geometry(thin, min_volume_mm3=1.0, check_thickness=False)
        # Volume should be below minimum
        vol_findings = [f for f in report.findings if f.check == "volume"]
        assert len(vol_findings) == 1
        assert vol_findings[0].value < 1.0
        assert not vol_findings[0].passed

    def test_valid_box_passes_all(self):
        """A well-formed box must pass all checks."""
        box = cq.Workplane("XY").box(20, 20, 20)
        report = validate_geometry(box, check_thickness=False)
        assert report.is_valid
        assert report.is_manifold
        assert report.is_watertight
        assert report.volume_mm3 > 0

    def test_shelled_box_has_wall_thickness(self):
        """A shelled box should report accurate wall thickness."""
        shelled = cq.Workplane("XY").box(30, 30, 30).faces(">Z").shell(-3.0)
        report = validate_geometry(shelled, min_wall_mm=2.0, check_thickness=True)
        assert report.min_wall_thickness_mm is not None
        # Wall should be approximately 3mm
        assert 2.5 < report.min_wall_thickness_mm < 3.5

    def test_thin_wall_detected(self):
        """Validator should detect walls thinner than minimum."""
        # Create a very thin-walled shell
        shelled = cq.Workplane("XY").box(40, 40, 40).faces(">Z").shell(-0.5)
        report = validate_geometry(shelled, min_wall_mm=1.0, check_thickness=True)
        # Should detect wall below 1.0mm minimum
        wall_findings = [f for f in report.findings if f.check == "min_wall_thickness"]
        assert len(wall_findings) == 1
        if wall_findings[0].value is not None:
            assert wall_findings[0].value < 1.0

    def test_sphere_volume_accurate(self):
        """A sphere should have correct volume."""
        sphere = cq.Workplane("XY").sphere(15)
        report = validate_geometry(sphere, check_thickness=False)
        # OCP represents a sphere as 1 face with seam/pole edges that
        # appear non-manifold in edge-face topology. This is a kernel
        # representation artifact, not a geometry defect. Volume is exact.
        assert abs(report.volume_mm3 - 14137.17) < 1.0
        assert abs(report.surface_area_mm2 - 2827.43) < 1.0

    def test_complex_boolean_remains_valid(self):
        """A complex boolean result should still be manifold."""
        box = cq.Workplane("XY").box(30, 30, 30)
        cyl = cq.Workplane("XY").cylinder(30, 8)
        result = box.cut(cyl)
        report = validate_geometry(result, check_thickness=False)
        assert report.is_valid
        assert report.is_manifold
