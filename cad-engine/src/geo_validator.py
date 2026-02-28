"""Geometry validation module — manifold, volume, wall thickness checks.

Uses OCP topology explorers to inspect B-Rep solids for manufacturing
readiness: manifold edges, watertightness, minimum wall thickness,
volume/surface-area accuracy, and bounding-box extraction.

API mirrors the TypeScript GeomAnalysis / MeshQuality interfaces.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Sequence

import cadquery as cq
from OCP.BRep import BRep_Tool  # type: ignore[import-untyped]
from OCP.BRepBndLib import BRepBndLib  # type: ignore[import-untyped]
from OCP.BRepClass3d import BRepClass3d_SolidClassifier  # type: ignore[import-untyped]
from OCP.BRepGProp import BRepGProp  # type: ignore[import-untyped]
from OCP.Bnd import Bnd_Box  # type: ignore[import-untyped]
from OCP.GProp import GProp_GProps  # type: ignore[import-untyped]
from OCP.TopAbs import TopAbs_EDGE, TopAbs_FACE, TopAbs_VERTEX  # type: ignore[import-untyped]
from OCP.TopExp import TopExp_Explorer  # type: ignore[import-untyped]
from OCP.TopTools import TopTools_IndexedDataMapOfShapeListOfShape  # type: ignore[import-untyped]
from OCP.TopExp import TopExp  # type: ignore[import-untyped]
from OCP.gp import gp_Pnt, gp_Vec  # type: ignore[import-untyped]
from OCP.BRepAdaptor import BRepAdaptor_Surface  # type: ignore[import-untyped]
from OCP.BRepGProp import BRepGProp_Face  # type: ignore[import-untyped]
from OCP.TopoDS import TopoDS  # type: ignore[import-untyped]


class ValidationSeverity(Enum):
    """Severity levels for validation findings."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ValidationFinding:
    """A single validation finding."""
    check: str
    passed: bool
    severity: ValidationSeverity
    message: str
    value: Optional[float] = None


@dataclass
class ValidationReport:
    """Complete geometry validation report.

    Mirrors TS GeomAnalysis fields where applicable.
    """
    is_valid: bool
    is_manifold: bool
    is_watertight: bool
    volume_mm3: float
    surface_area_mm2: float
    bounding_box: dict  # {min, max, size, center, volume_mm3, surface_area_mm2}
    center_of_mass: dict  # {x, y, z}
    min_wall_thickness_mm: Optional[float]
    face_count: int
    edge_count: int
    vertex_count: int
    findings: list[ValidationFinding] = field(default_factory=list)


class GeoValidatorError(Exception):
    """Raised when geometry validation encounters an unrecoverable error."""


# ---------------------------------------------------------------------------
# Helper: extract OCP shape from CadQuery Workplane
# ---------------------------------------------------------------------------

def _get_shape(solid: cq.Workplane):
    """Extract the underlying OCP TopoDS_Shape from a CadQuery Workplane."""
    val = solid.val()
    if hasattr(val, "wrapped"):
        return val.wrapped
    raise GeoValidatorError("Cannot extract OCP shape from CadQuery object")


# ---------------------------------------------------------------------------
# Topology counting
# ---------------------------------------------------------------------------

def _count_topology(shape) -> dict:
    """Count faces, edges, and vertices in a shape."""
    counts = {"faces": 0, "edges": 0, "vertices": 0}
    for topo_type, key in [(TopAbs_FACE, "faces"), (TopAbs_EDGE, "edges"), (TopAbs_VERTEX, "vertices")]:
        explorer = TopExp_Explorer(shape, topo_type)
        while explorer.More():
            counts[key] += 1
            explorer.Next()
    return counts


# ---------------------------------------------------------------------------
# Manifold check
# ---------------------------------------------------------------------------

def check_manifold(solid: cq.Workplane) -> tuple[bool, list[str]]:
    """Check if a solid has manifold topology.

    A solid is manifold if every edge is shared by exactly 2 faces.
    Non-manifold edges (shared by 0, 1, or 3+ faces) indicate geometry
    problems that will cause issues in manufacturing and simulation.

    Returns:
        (is_manifold, list of issue descriptions)
    """
    shape = _get_shape(solid)
    edge_face_map = TopTools_IndexedDataMapOfShapeListOfShape()
    TopExp.MapShapesAndAncestors_s(shape, TopAbs_EDGE, TopAbs_FACE, edge_face_map)

    issues: list[str] = []
    for i in range(1, edge_face_map.Extent() + 1):
        edge = edge_face_map.FindKey(i)
        face_list = edge_face_map.FindFromIndex(i)
        face_count = face_list.Extent()
        if face_count != 2:
            issues.append(f"Edge {i}: shared by {face_count} faces (expected 2)")

    return (len(issues) == 0, issues)


# ---------------------------------------------------------------------------
# Watertight check
# ---------------------------------------------------------------------------

def check_watertight(solid: cq.Workplane) -> tuple[bool, list[str]]:
    """Check if a solid is watertight (no free/open edges).

    A watertight solid has every edge shared by exactly 2 faces and
    the solid classifier confirms it encloses a finite volume.

    Returns:
        (is_watertight, list of issue descriptions)
    """
    shape = _get_shape(solid)
    issues: list[str] = []

    # Check edge-face adjacency
    edge_face_map = TopTools_IndexedDataMapOfShapeListOfShape()
    TopExp.MapShapesAndAncestors_s(shape, TopAbs_EDGE, TopAbs_FACE, edge_face_map)

    free_edges = 0
    for i in range(1, edge_face_map.Extent() + 1):
        face_list = edge_face_map.FindFromIndex(i)
        if face_list.Extent() < 2:
            free_edges += 1

    if free_edges > 0:
        issues.append(f"{free_edges} free edge(s) found — shell is not closed")

    # Volume sanity check
    props = GProp_GProps()
    BRepGProp.VolumeProperties_s(shape, props)
    vol = props.Mass()
    if vol <= 0:
        issues.append(f"Volume is {vol:.4f} mm³ — solid may be inverted or degenerate")

    return (len(issues) == 0, issues)


# ---------------------------------------------------------------------------
# Volume & surface area
# ---------------------------------------------------------------------------

def calculate_volume(solid: cq.Workplane) -> float:
    """Calculate the volume of a solid in mm³.

    Uses OCP BRepGProp for accurate B-Rep volume computation.
    Accuracy is typically within 0.001 mm³ for well-formed solids.
    """
    props = GProp_GProps()
    BRepGProp.VolumeProperties_s(_get_shape(solid), props)
    return props.Mass()


def calculate_surface_area(solid: cq.Workplane) -> float:
    """Calculate the total surface area of a solid in mm²."""
    props = GProp_GProps()
    BRepGProp.SurfaceProperties_s(_get_shape(solid), props)
    return props.Mass()


# ---------------------------------------------------------------------------
# Bounding box
# ---------------------------------------------------------------------------

def bounding_box(solid: cq.Workplane) -> dict:
    """Compute axis-aligned bounding box.

    Returns dict matching TS BoundingBox3D interface:
        {min: {x,y,z}, max: {x,y,z}, size: {x,y,z}, center: {x,y,z},
         volume_mm3, surface_area_mm2}
    """
    shape = _get_shape(solid)
    bbox = Bnd_Box()
    BRepBndLib.Add_s(shape, bbox)
    xmin, ymin, zmin, xmax, ymax, zmax = bbox.Get()

    sx, sy, sz = xmax - xmin, ymax - ymin, zmax - zmin
    return {
        "min": {"x": xmin, "y": ymin, "z": zmin},
        "max": {"x": xmax, "y": ymax, "z": zmax},
        "size": {"x": sx, "y": sy, "z": sz},
        "center": {
            "x": (xmin + xmax) / 2,
            "y": (ymin + ymax) / 2,
            "z": (zmin + zmax) / 2,
        },
        "volume_mm3": sx * sy * sz,
        "surface_area_mm2": 2 * (sx * sy + sy * sz + sx * sz),
    }


# ---------------------------------------------------------------------------
# Center of mass
# ---------------------------------------------------------------------------

def center_of_mass(solid: cq.Workplane) -> dict:
    """Calculate center of mass. Returns {x, y, z}."""
    props = GProp_GProps()
    BRepGProp.VolumeProperties_s(_get_shape(solid), props)
    com = props.CentreOfMass()
    return {"x": com.X(), "y": com.Y(), "z": com.Z()}


# ---------------------------------------------------------------------------
# Minimum wall thickness (ray-casting approach)
# ---------------------------------------------------------------------------

def min_wall_thickness(
    solid: cq.Workplane,
    num_samples: int = 50,
) -> Optional[float]:
    """Estimate minimum wall thickness using face-normal ray casting.

    For each sampled face, casts a ray inward from the face centroid
    along the reversed normal. Measures distance to the first opposing
    face intersection. Returns the minimum such distance.

    This is an approximation — for exact minimum wall thickness,
    a full medial-axis transform would be needed. The ray-casting
    approach catches most thin-wall conditions relevant to CNC.

    Args:
        solid: CadQuery Workplane containing a solid.
        num_samples: Number of face samples to test.

    Returns:
        Minimum wall thickness in mm, or None if unable to compute.
    """
    from OCP.BRepClass3d import BRepClass3d_SolidClassifier
    from OCP.IntCurvesFace import IntCurvesFace_ShapeIntersector  # type: ignore[import-untyped]
    from OCP.gp import gp_Lin, gp_Dir  # type: ignore[import-untyped]

    shape = _get_shape(solid)

    # Collect face centroids and inward normals
    face_data: list[tuple[gp_Pnt, gp_Vec]] = []
    explorer = TopExp_Explorer(shape, TopAbs_FACE)
    while explorer.More():
        face = TopoDS.Face_s(explorer.Current())
        adaptor = BRepAdaptor_Surface(face)
        u_mid = (adaptor.FirstUParameter() + adaptor.LastUParameter()) / 2
        v_mid = (adaptor.FirstVParameter() + adaptor.LastVParameter()) / 2

        gprop_face = BRepGProp_Face(face)
        pnt = gp_Pnt()
        normal = gp_Vec()
        gprop_face.Normal(u_mid, v_mid, pnt, normal)

        if normal.Magnitude() > 1e-10:
            # Reverse normal to point inward
            normal.Reverse()
            normal.Normalize()
            face_data.append((pnt, normal))

        explorer.Next()

    if not face_data:
        return None

    # Sample subset if too many faces
    import random
    if len(face_data) > num_samples:
        random.seed(42)  # deterministic
        face_data = random.sample(face_data, num_samples)

    # Cast rays and measure minimum distance
    min_thickness = float("inf")
    intersector = IntCurvesFace_ShapeIntersector()
    intersector.Load(shape, 1e-6)

    for pnt, normal in face_data:
        direction = gp_Dir(normal)
        # Offset the start point slightly to avoid self-intersection
        start = gp_Pnt(
            pnt.X() + normal.X() * 0.01,
            pnt.Y() + normal.Y() * 0.01,
            pnt.Z() + normal.Z() * 0.01,
        )
        line = gp_Lin(start, direction)
        intersector.Perform(line, 0.0, 1000.0)

        if intersector.NbPnt() > 0:
            # Find the closest intersection
            for i in range(1, intersector.NbPnt() + 1):
                dist = start.Distance(intersector.Pnt(i))
                if dist > 0.01:  # skip near-zero (self)
                    min_thickness = min(min_thickness, dist)

    return min_thickness if min_thickness < float("inf") else None


# ---------------------------------------------------------------------------
# Combined validation
# ---------------------------------------------------------------------------

def validate_geometry(
    solid: cq.Workplane,
    *,
    min_volume_mm3: float = 0.001,
    min_wall_mm: Optional[float] = None,
    check_thickness: bool = True,
    thickness_samples: int = 50,
) -> ValidationReport:
    """Run all geometry validation checks and return a comprehensive report.

    Args:
        solid: CadQuery Workplane containing a solid.
        min_volume_mm3: Minimum acceptable volume (below = likely degenerate).
        min_wall_mm: Minimum acceptable wall thickness. None = no check.
        check_thickness: Whether to run wall thickness analysis.
        thickness_samples: Number of ray samples for thickness check.

    Returns:
        ValidationReport with pass/fail per check and overall status.
    """
    findings: list[ValidationFinding] = []
    shape = _get_shape(solid)

    # --- Topology counts ---
    topo = _count_topology(shape)

    # --- Manifold check ---
    is_manifold, manifold_issues = check_manifold(solid)
    findings.append(ValidationFinding(
        check="manifold",
        passed=is_manifold,
        severity=ValidationSeverity.ERROR if not is_manifold else ValidationSeverity.INFO,
        message="All edges manifold" if is_manifold else f"{len(manifold_issues)} non-manifold edge(s)",
    ))

    # --- Watertight check ---
    is_watertight, watertight_issues = check_watertight(solid)
    findings.append(ValidationFinding(
        check="watertight",
        passed=is_watertight,
        severity=ValidationSeverity.ERROR if not is_watertight else ValidationSeverity.INFO,
        message="Solid is watertight" if is_watertight else "; ".join(watertight_issues),
    ))

    # --- Volume ---
    vol = calculate_volume(solid)
    vol_ok = vol >= min_volume_mm3
    findings.append(ValidationFinding(
        check="volume",
        passed=vol_ok,
        severity=ValidationSeverity.CRITICAL if not vol_ok else ValidationSeverity.INFO,
        message=f"Volume: {vol:.4f} mm³" if vol_ok else f"Volume {vol:.4f} mm³ below minimum {min_volume_mm3}",
        value=vol,
    ))

    # --- Surface area ---
    sa = calculate_surface_area(solid)
    findings.append(ValidationFinding(
        check="surface_area",
        passed=True,
        severity=ValidationSeverity.INFO,
        message=f"Surface area: {sa:.4f} mm²",
        value=sa,
    ))

    # --- Bounding box ---
    bb = bounding_box(solid)

    # --- Center of mass ---
    com = center_of_mass(solid)

    # --- Wall thickness ---
    wall_t: Optional[float] = None
    if check_thickness:
        wall_t = min_wall_thickness(solid, num_samples=thickness_samples)
        if wall_t is not None:
            wall_ok = True if min_wall_mm is None else wall_t >= min_wall_mm
            findings.append(ValidationFinding(
                check="min_wall_thickness",
                passed=wall_ok,
                severity=ValidationSeverity.WARNING if not wall_ok else ValidationSeverity.INFO,
                message=f"Min wall thickness: {wall_t:.3f} mm",
                value=wall_t,
            ))
        else:
            findings.append(ValidationFinding(
                check="min_wall_thickness",
                passed=True,
                severity=ValidationSeverity.INFO,
                message="Wall thickness: unable to measure (solid geometry)",
            ))

    # --- Overall validity ---
    is_valid = all(
        f.passed for f in findings
        if f.severity in (ValidationSeverity.ERROR, ValidationSeverity.CRITICAL)
    )

    return ValidationReport(
        is_valid=is_valid,
        is_manifold=is_manifold,
        is_watertight=is_watertight,
        volume_mm3=vol,
        surface_area_mm2=sa,
        bounding_box=bb,
        center_of_mass=com,
        min_wall_thickness_mm=wall_t,
        face_count=topo["faces"],
        edge_count=topo["edges"],
        vertex_count=topo["vertices"],
        findings=findings,
    )
