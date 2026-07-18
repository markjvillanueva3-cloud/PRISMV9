"""Multi-format CAD export — STEP, DXF, STL, IGES.

Provides export and import functions for common CAD interchange formats.
Uses CadQuery and OCP (OpenCascade) writers/readers directly.

API mirrors the TypeScript exportDispatcher action patterns.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import cadquery as cq
from OCP.IFSelect import IFSelect_RetDone  # type: ignore[import-untyped]
from OCP.IGESControl import IGESControl_Writer  # type: ignore[import-untyped]
from OCP.STEPControl import (  # type: ignore[import-untyped]
    STEPControl_AsIs,
    STEPControl_Writer,
    STEPControl_Reader,
)
from OCP.StlAPI import StlAPI_Writer  # type: ignore[import-untyped]
from OCP.BRepMesh import BRepMesh_IncrementalMesh  # type: ignore[import-untyped]
from OCP.Interface import Interface_Static  # type: ignore[import-untyped]


class CadExportError(Exception):
    """Raised when a CAD export/import operation fails."""


@dataclass
class ExportResult:
    """Result of an export operation."""
    output_path: str
    format: str
    format_version: str
    file_size_bytes: int
    success: bool
    notes: str = ""


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _get_shape(solid: cq.Workplane):
    """Extract the underlying OCP TopoDS_Shape."""
    val = solid.val()
    if hasattr(val, "wrapped"):
        return val.wrapped
    raise CadExportError("Cannot extract OCP shape from CadQuery object")


def _ensure_dir(path: str) -> None:
    """Ensure the parent directory exists."""
    parent = os.path.dirname(os.path.abspath(path))
    os.makedirs(parent, exist_ok=True)


# ---------------------------------------------------------------------------
# STEP export (AP214)
# ---------------------------------------------------------------------------

def export_step(
    solid: cq.Workplane,
    output_path: str,
    *,
    application_protocol: str = "AP214",
) -> ExportResult:
    """Export a solid to STEP format (AP214 by default).

    Produces ISO 10303-21 STEP files readable by FreeCAD, Fusion360,
    SolidWorks, and other major CAD packages.

    Args:
        solid: CadQuery Workplane containing a solid.
        output_path: File path for the output .step file.
        application_protocol: STEP AP version ('AP203' or 'AP214').
    """
    _ensure_dir(output_path)
    shape = _get_shape(solid)

    writer = STEPControl_Writer()
    # Set AP version
    if application_protocol == "AP203":
        Interface_Static.SetCVal_s("write.step.schema", "AP203")
    else:
        Interface_Static.SetCVal_s("write.step.schema", "AP214IS")

    writer.Transfer(shape, STEPControl_AsIs)
    status = writer.Write(output_path)

    if status != IFSelect_RetDone:
        raise CadExportError(f"STEP export failed with status {status}")

    file_size = os.path.getsize(output_path)
    return ExportResult(
        output_path=output_path,
        format="STEP",
        format_version=application_protocol,
        file_size_bytes=file_size,
        success=True,
    )


# ---------------------------------------------------------------------------
# STL export (binary)
# ---------------------------------------------------------------------------

def export_stl(
    solid: cq.Workplane,
    output_path: str,
    *,
    tolerance: float = 0.1,
    angular_tolerance: float = 0.1,
    binary: bool = True,
) -> ExportResult:
    """Export a solid to STL format.

    Tessellates the B-Rep solid into triangles and writes binary or
    ASCII STL. Tolerance controls mesh density.

    Args:
        solid: CadQuery Workplane containing a solid.
        output_path: File path for the output .stl file.
        tolerance: Linear deflection tolerance in mm (lower = finer mesh).
        angular_tolerance: Angular deflection in radians.
        binary: If True, write binary STL (smaller files).
    """
    _ensure_dir(output_path)
    shape = _get_shape(solid)

    # Tessellate
    mesh = BRepMesh_IncrementalMesh(shape, tolerance, False, angular_tolerance, True)
    mesh.Perform()
    if not mesh.IsDone():
        raise CadExportError("STL tessellation failed")

    writer = StlAPI_Writer()
    writer.ASCIIMode = not binary
    success = writer.Write(shape, output_path)

    if not success:
        raise CadExportError("STL write failed")

    file_size = os.path.getsize(output_path)
    return ExportResult(
        output_path=output_path,
        format="STL",
        format_version="binary" if binary else "ASCII",
        file_size_bytes=file_size,
        success=True,
    )


# ---------------------------------------------------------------------------
# IGES export
# ---------------------------------------------------------------------------

def export_iges(
    solid: cq.Workplane,
    output_path: str,
) -> ExportResult:
    """Export a solid to IGES format (5.3).

    IGES is a legacy format still used by some CAM systems. Prefer
    STEP for modern workflows.

    Args:
        solid: CadQuery Workplane containing a solid.
        output_path: File path for the output .iges file.
    """
    _ensure_dir(output_path)
    shape = _get_shape(solid)

    writer = IGESControl_Writer()
    writer.AddShape(shape)
    writer.ComputeModel()
    success = writer.Write(output_path)

    if not success:
        raise CadExportError("IGES export failed")

    file_size = os.path.getsize(output_path)
    return ExportResult(
        output_path=output_path,
        format="IGES",
        format_version="5.3",
        file_size_bytes=file_size,
        success=True,
    )


# ---------------------------------------------------------------------------
# DXF export (2D projection)
# ---------------------------------------------------------------------------

def export_dxf(
    solid: cq.Workplane,
    output_path: str,
    *,
    projection_dir: tuple[float, float, float] = (0, 0, 1),
) -> ExportResult:
    """Export a solid to DXF format via 2D projection.

    Projects the 3D solid onto a 2D plane and writes edges as DXF
    entities. Default projection is top-down (Z-axis).

    Args:
        solid: CadQuery Workplane containing a solid.
        output_path: File path for the output .dxf file.
        projection_dir: Direction vector for the 2D projection.
    """
    _ensure_dir(output_path)

    # CadQuery has a built-in DXF export via section/projection
    try:
        cq.exporters.export(solid, output_path, exportType="DXF")
    except Exception as exc:
        raise CadExportError(f"DXF export failed: {exc}") from exc

    file_size = os.path.getsize(output_path)
    return ExportResult(
        output_path=output_path,
        format="DXF",
        format_version="R2013",
        file_size_bytes=file_size,
        success=True,
    )


# ---------------------------------------------------------------------------
# STEP import
# ---------------------------------------------------------------------------

def import_step(input_path: str) -> cq.Workplane:
    """Import a STEP file and return a CadQuery Workplane.

    Args:
        input_path: Path to the .step file.

    Returns:
        CadQuery Workplane containing the imported solid(s).
    """
    if not os.path.exists(input_path):
        raise CadExportError(f"STEP file not found: {input_path}")

    result = cq.importers.importStep(input_path)
    return result


# ---------------------------------------------------------------------------
# Convenience: export all formats
# ---------------------------------------------------------------------------

def export_all(
    solid: cq.Workplane,
    base_path: str,
    name: str,
) -> dict[str, ExportResult]:
    """Export a solid to all supported formats.

    Creates files: {base_path}/{name}.step, .stl, .iges, .dxf

    Args:
        solid: CadQuery Workplane containing a solid.
        base_path: Directory for output files.
        name: Base filename (without extension).

    Returns:
        Dict mapping format name to ExportResult.
    """
    os.makedirs(base_path, exist_ok=True)
    results: dict[str, ExportResult] = {}

    results["STEP"] = export_step(solid, os.path.join(base_path, f"{name}.step"))
    results["STL"] = export_stl(solid, os.path.join(base_path, f"{name}.stl"))
    results["IGES"] = export_iges(solid, os.path.join(base_path, f"{name}.iges"))

    try:
        results["DXF"] = export_dxf(solid, os.path.join(base_path, f"{name}.dxf"))
    except CadExportError:
        # DXF can fail for complex 3D solids — not critical
        results["DXF"] = ExportResult(
            output_path=os.path.join(base_path, f"{name}.dxf"),
            format="DXF",
            format_version="R2013",
            file_size_bytes=0,
            success=False,
            notes="DXF export failed — complex 3D geometry may not project cleanly",
        )

    return results
