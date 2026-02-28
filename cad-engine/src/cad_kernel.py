"""CadQuery wrapper module — parametric CAD operations for PRISM.

Provides a Python API for creating, modifying, and analyzing 3D geometry
using CadQuery 2.x as the underlying B-Rep kernel (OpenCascade via OCP).

API surface mirrors the TypeScript GeometryEngine where applicable.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Sequence, Union

import cadquery as cq
from OCP.BRepGProp import BRepGProp  # type: ignore[import-untyped]
from OCP.GProp import GProp_GProps  # type: ignore[import-untyped]


class CadKernelError(Exception):
    """Raised when a CAD operation fails."""


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------

@dataclass
class Vec3:
    """3D vector / point."""
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

    def as_tuple(self) -> tuple[float, float, float]:
        return (self.x, self.y, self.z)


@dataclass
class BoundingBox:
    """Axis-aligned bounding box."""
    min: Vec3
    max: Vec3
    size: Vec3
    center: Vec3
    volume_mm3: float
    surface_area_mm2: float


@dataclass
class CadResult:
    """Result wrapper for CAD operations."""
    solid: cq.Workplane
    name: str = ""
    metadata: dict = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Sketch creation
# ---------------------------------------------------------------------------

def create_sketch(
    shape: str = "rectangle",
    *,
    width: float = 0.0,
    height: float = 0.0,
    radius: float = 0.0,
    sides: int = 6,
    points: Optional[Sequence[tuple[float, float]]] = None,
    workplane: str = "XY",
) -> cq.Workplane:
    """Create a 2D sketch on the specified workplane.

    Args:
        shape: One of 'rectangle', 'circle', 'polygon', 'slot'.
        width: Width for rectangle/slot.
        height: Height for rectangle.
        radius: Radius for circle/polygon.
        sides: Number of sides for polygon.
        points: Vertices for freeform polygon.
        workplane: CadQuery workplane string (e.g. 'XY', 'XZ', 'YZ').

    Returns:
        CadQuery Workplane with the 2D sketch on it.
    """
    wp = cq.Workplane(workplane)

    if shape == "rectangle":
        if width <= 0 or height <= 0:
            raise CadKernelError(f"Rectangle requires width>0 and height>0, got {width}x{height}")
        return wp.rect(width, height)

    if shape == "circle":
        if radius <= 0:
            raise CadKernelError(f"Circle requires radius>0, got {radius}")
        return wp.circle(radius)

    if shape == "polygon":
        if points is not None:
            wp_sketch = wp.moveTo(*points[0])
            for pt in points[1:]:
                wp_sketch = wp_sketch.lineTo(*pt)
            return wp_sketch.close()
        if radius <= 0 or sides < 3:
            raise CadKernelError(f"Polygon requires radius>0 and sides>=3, got r={radius} n={sides}")
        return wp.polygon(sides, radius * 2)

    if shape == "slot":
        if width <= 0 or height <= 0:
            raise CadKernelError(f"Slot requires width>0 and height>0, got {width}x{height}")
        return wp.slot2D(width, height)

    raise CadKernelError(f"Unknown sketch shape: {shape}")


# ---------------------------------------------------------------------------
# 3D operations
# ---------------------------------------------------------------------------

def extrude(sketch: cq.Workplane, height: float, taper: float = 0.0) -> cq.Workplane:
    """Extrude a 2D sketch into a 3D solid.

    Args:
        sketch: CadQuery Workplane with a 2D sketch.
        height: Extrusion height in mm. Negative for downward.
        taper: Draft angle in degrees (0 = straight extrusion).
    """
    if height == 0:
        raise CadKernelError("Extrude height cannot be zero")
    return sketch.extrude(height, taper=taper)


def revolve(
    sketch: cq.Workplane,
    angle: float = 360.0,
    axis_start: tuple[float, float] = (0, 0),
    axis_end: tuple[float, float] = (0, 1),
) -> cq.Workplane:
    """Revolve a 2D sketch around an axis.

    Args:
        sketch: CadQuery Workplane with a 2D sketch.
        angle: Revolution angle in degrees (default 360 = full revolution).
        axis_start: Start point of revolution axis (2D on sketch plane).
        axis_end: End point of revolution axis (2D on sketch plane).
    """
    if angle == 0:
        raise CadKernelError("Revolve angle cannot be zero")
    return sketch.revolve(angle, axis_start, axis_end)


def loft(profiles: Sequence[cq.Workplane], ruled: bool = False) -> cq.Workplane:
    """Loft between multiple profiles to create a solid.

    Args:
        profiles: Sequence of CadQuery Workplanes, each with a 2D sketch.
        ruled: If True, create ruled surfaces (straight between profiles).
    """
    if len(profiles) < 2:
        raise CadKernelError("Loft requires at least 2 profiles")
    base = profiles[0]
    for p in profiles[1:]:
        base = base.add(p)
    return base.loft(ruled=ruled)


# ---------------------------------------------------------------------------
# Feature operations
# ---------------------------------------------------------------------------

def fillet(solid: cq.Workplane, radius: float, edges: Optional[str] = None) -> cq.Workplane:
    """Apply fillet (round) to edges.

    Args:
        solid: CadQuery Workplane containing a solid.
        radius: Fillet radius in mm.
        edges: Edge selector string (e.g. '|Z', '>Z'). None = all edges.
    """
    if radius <= 0:
        raise CadKernelError(f"Fillet radius must be >0, got {radius}")
    if edges:
        return solid.edges(edges).fillet(radius)
    return solid.edges().fillet(radius)


def chamfer(solid: cq.Workplane, distance: float, edges: Optional[str] = None) -> cq.Workplane:
    """Apply chamfer to edges.

    Args:
        solid: CadQuery Workplane containing a solid.
        distance: Chamfer distance in mm.
        edges: Edge selector string. None = all edges.
    """
    if distance <= 0:
        raise CadKernelError(f"Chamfer distance must be >0, got {distance}")
    if edges:
        return solid.edges(edges).chamfer(distance)
    return solid.edges().chamfer(distance)


def hole(
    solid: cq.Workplane,
    diameter: float,
    depth: Optional[float] = None,
    position: Optional[tuple[float, float]] = None,
) -> cq.Workplane:
    """Create a hole in a solid.

    Args:
        solid: CadQuery Workplane containing a solid.
        diameter: Hole diameter in mm.
        depth: Hole depth in mm. None = through-all.
        position: (x, y) position for the hole center. None = origin.
    """
    if diameter <= 0:
        raise CadKernelError(f"Hole diameter must be >0, got {diameter}")
    wp = solid
    if position:
        wp = wp.pushPoints([position])
    if depth:
        return wp.hole(diameter, depth)
    return wp.hole(diameter)


def shell(solid: cq.Workplane, thickness: float, faces_to_remove: Optional[str] = None) -> cq.Workplane:
    """Shell a solid (hollow it out).

    Args:
        solid: CadQuery Workplane containing a solid.
        thickness: Shell wall thickness in mm.
        faces_to_remove: Face selector for open faces (e.g. '>Z' = top face).
    """
    if thickness <= 0:
        raise CadKernelError(f"Shell thickness must be >0, got {thickness}")
    if faces_to_remove:
        return solid.faces(faces_to_remove).shell(-thickness)
    return solid.shell(-thickness)


def pattern(
    solid: cq.Workplane,
    count: int,
    spacing: float,
    direction: str = "X",
) -> cq.Workplane:
    """Create a linear pattern of a solid.

    Args:
        solid: CadQuery Workplane containing a solid.
        count: Number of copies (including original).
        spacing: Distance between copies in mm.
        direction: Pattern direction ('X', 'Y', or 'Z').
    """
    if count < 1:
        raise CadKernelError(f"Pattern count must be >=1, got {count}")
    if count == 1:
        return solid

    dir_map = {"X": (1, 0, 0), "Y": (0, 1, 0), "Z": (0, 0, 1)}
    if direction.upper() not in dir_map:
        raise CadKernelError(f"Pattern direction must be X, Y, or Z, got {direction}")

    dx, dy, dz = dir_map[direction.upper()]
    result = solid
    for i in range(1, count):
        offset = (dx * spacing * i, dy * spacing * i, dz * spacing * i)
        copy = solid.translate(offset)
        result = result.union(copy)
    return result


# ---------------------------------------------------------------------------
# Transform operations
# ---------------------------------------------------------------------------

def mirror(solid: cq.Workplane, plane: str = "XY") -> cq.Workplane:
    """Mirror a solid across a plane.

    Args:
        solid: CadQuery Workplane containing a solid.
        plane: Mirror plane ('XY', 'XZ', 'YZ').
    """
    return solid.mirror(plane)


def translate(solid: cq.Workplane, vec: Union[Vec3, tuple[float, float, float]]) -> cq.Workplane:
    """Translate (move) a solid.

    Args:
        solid: CadQuery Workplane containing a solid.
        vec: Translation vector as Vec3 or (x, y, z) tuple.
    """
    if isinstance(vec, Vec3):
        vec = vec.as_tuple()
    return solid.translate(vec)


def rotate(
    solid: cq.Workplane,
    axis: tuple[float, float, float] = (0, 0, 1),
    angle: float = 0.0,
) -> cq.Workplane:
    """Rotate a solid around an axis through the origin.

    Args:
        solid: CadQuery Workplane containing a solid.
        axis: Rotation axis as (x, y, z) direction vector.
        angle: Rotation angle in degrees.
    """
    if angle == 0:
        return solid
    return solid.rotate((0, 0, 0), axis, angle)


# ---------------------------------------------------------------------------
# Boolean operations
# ---------------------------------------------------------------------------

def union(a: cq.Workplane, b: cq.Workplane) -> cq.Workplane:
    """Boolean union of two solids."""
    return a.union(b)


def subtract(a: cq.Workplane, b: cq.Workplane) -> cq.Workplane:
    """Boolean subtraction: a minus b."""
    return a.cut(b)


def intersect(a: cq.Workplane, b: cq.Workplane) -> cq.Workplane:
    """Boolean intersection of two solids."""
    return a.intersect(b)


# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------

def volume(solid: cq.Workplane) -> float:
    """Calculate the volume of a solid in mm^3."""
    return solid.val().Volume()


def surface_area(solid: cq.Workplane) -> float:
    """Calculate the total surface area of a solid in mm^2."""
    props = GProp_GProps()
    BRepGProp.SurfaceProperties_s(solid.val().wrapped, props)
    return props.Mass()


def bounding_box(solid: cq.Workplane) -> BoundingBox:
    """Compute the axis-aligned bounding box of a solid."""
    bb = solid.val().BoundingBox()
    min_pt = Vec3(bb.xmin, bb.ymin, bb.zmin)
    max_pt = Vec3(bb.xmax, bb.ymax, bb.zmax)
    size = Vec3(bb.xmax - bb.xmin, bb.ymax - bb.ymin, bb.zmax - bb.zmin)
    center = Vec3(
        (bb.xmin + bb.xmax) / 2,
        (bb.ymin + bb.ymax) / 2,
        (bb.zmin + bb.zmax) / 2,
    )
    vol = size.x * size.y * size.z
    sa = 2 * (size.x * size.y + size.y * size.z + size.x * size.z)
    return BoundingBox(
        min=min_pt, max=max_pt, size=size, center=center,
        volume_mm3=vol, surface_area_mm2=sa,
    )


def center_of_mass(solid: cq.Workplane) -> Vec3:
    """Calculate the center of mass of a solid."""
    props = GProp_GProps()
    BRepGProp.VolumeProperties_s(solid.val().wrapped, props)
    com = props.CentreOfMass()
    return Vec3(com.X(), com.Y(), com.Z())


# ---------------------------------------------------------------------------
# Convenience: box, cylinder, sphere
# ---------------------------------------------------------------------------

def box(
    width: float, height: float, depth: float,
    centered: bool = True, workplane: str = "XY",
) -> cq.Workplane:
    """Create a box (rectangular prism).

    Args:
        width: X dimension in mm.
        height: Y dimension in mm.
        depth: Z dimension in mm.
        centered: If True, center the box on the origin.
        workplane: CadQuery workplane string.
    """
    return cq.Workplane(workplane).box(width, height, depth, centered=(centered, centered, centered))


def cylinder(
    radius: float, height: float,
    centered: bool = True, workplane: str = "XY",
) -> cq.Workplane:
    """Create a cylinder.

    Args:
        radius: Cylinder radius in mm.
        height: Cylinder height in mm.
        centered: If True, center on the origin.
        workplane: CadQuery workplane string.
    """
    return cq.Workplane(workplane).cylinder(height, radius, centered=(True, True, centered))


def sphere(radius: float, workplane: str = "XY") -> cq.Workplane:
    """Create a sphere.

    Args:
        radius: Sphere radius in mm.
        workplane: CadQuery workplane string.
    """
    return cq.Workplane(workplane).sphere(radius)


def cone(
    radius_bottom: float, radius_top: float, height: float,
    workplane: str = "XY",
) -> cq.Workplane:
    """Create a cone or truncated cone.

    Args:
        radius_bottom: Bottom radius in mm.
        radius_top: Top radius in mm (0 for a point).
        height: Cone height in mm.
        workplane: CadQuery workplane string.
    """
    sketch = cq.Workplane(workplane).circle(radius_bottom)
    return sketch.extrude(height, taper=0) if radius_top == radius_bottom else (
        sketch.workplane(offset=height).circle(radius_top).loft()
    )
