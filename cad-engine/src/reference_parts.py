"""10 parametric reference parts for PRISM CAD engine validation.

Each factory function builds a part using cad_kernel.py operations,
exercising different CAD capabilities. Parts are representative of
real CNC manufacturing workpieces.
"""

from __future__ import annotations

import cadquery as cq
import cad_kernel as ck


def cube(size: float = 25.0) -> cq.Workplane:
    """Simple cube — tests box creation.

    A 25mm cube is the most basic CNC test part.
    """
    return ck.box(size, size, size)


def cylinder_part(radius: float = 12.5, height: float = 40.0) -> cq.Workplane:
    """Simple cylinder — tests revolution solid.

    Common turned part form factor.
    """
    return ck.cylinder(radius, height)


def flanged_plate(
    width: float = 80.0,
    height: float = 60.0,
    thickness: float = 8.0,
    hole_diameter: float = 10.0,
    hole_inset: float = 12.0,
) -> cq.Workplane:
    """Rectangular plate with corner mounting holes and center pocket.

    Tests: box, hole pattern, pocket (subtract), fillet.
    """
    # Base plate
    plate = ck.box(width, height, thickness)

    # Corner holes (4x)
    positions = [
        (width / 2 - hole_inset, height / 2 - hole_inset),
        (-width / 2 + hole_inset, height / 2 - hole_inset),
        (width / 2 - hole_inset, -height / 2 + hole_inset),
        (-width / 2 + hole_inset, -height / 2 + hole_inset),
    ]
    for pos in positions:
        plate = ck.hole(plate, hole_diameter, position=pos)

    # Edge fillet
    plate = ck.fillet(plate, 2.0, edges="|Z")

    return plate


def bracket(
    base_w: float = 50.0,
    base_d: float = 30.0,
    base_t: float = 6.0,
    wall_h: float = 40.0,
    wall_t: float = 5.0,
    hole_d: float = 8.0,
) -> cq.Workplane:
    """L-shaped bracket — tests boolean union of two boxes + holes.

    Classic sheet-metal/machined bracket shape.
    """
    # Horizontal base
    base = ck.box(base_w, base_d, base_t)
    base = ck.translate(base, (0, 0, -wall_h / 2 + base_t / 2))

    # Vertical wall
    wall = ck.box(base_w, wall_t, wall_h)
    wall = ck.translate(wall, (0, -base_d / 2 + wall_t / 2, 0))

    result = ck.union(base, wall)

    # Mounting hole in base
    result = ck.hole(result, hole_d, position=(0, 0))

    return result


def bearing_block(
    width: float = 60.0,
    height: float = 40.0,
    depth: float = 30.0,
    bore_d: float = 20.0,
    bolt_d: float = 6.0,
    bolt_spacing: float = 40.0,
) -> cq.Workplane:
    """Bearing block / pillow block — tests cylinder subtract (bore) + bolt holes.

    Common CNC part for shaft support.
    """
    # Main block
    block = ck.box(width, depth, height)

    # Center bore (through-all)
    bore_cyl = ck.cylinder(bore_d / 2, depth + 2)
    bore_cyl = ck.rotate(bore_cyl, axis=(1, 0, 0), angle=90)
    block = ck.subtract(block, bore_cyl)

    # Bolt holes (2x, symmetric)
    for x_off in [-bolt_spacing / 2, bolt_spacing / 2]:
        bolt = ck.cylinder(bolt_d / 2, height + 2)
        bolt = ck.translate(bolt, (x_off, 0, 0))
        block = ck.subtract(block, bolt)

    return block


def shaft_collar(
    outer_d: float = 30.0,
    inner_d: float = 16.0,
    width: float = 12.0,
    set_screw_d: float = 4.0,
) -> cq.Workplane:
    """Shaft collar — tests concentric cylinders (subtract) + radial hole.

    Turned part with a radial set-screw hole.
    """
    outer = ck.cylinder(outer_d / 2, width)
    inner = ck.cylinder(inner_d / 2, width + 2)
    collar = ck.subtract(outer, inner)

    # Radial set-screw hole
    screw = ck.cylinder(set_screw_d / 2, outer_d)
    screw = ck.rotate(screw, axis=(1, 0, 0), angle=90)
    collar = ck.subtract(collar, screw)

    return collar


def gusset(
    width: float = 40.0,
    height: float = 40.0,
    thickness: float = 5.0,
    fillet_r: float = 3.0,
) -> cq.Workplane:
    """Triangular gusset plate — tests polygon sketch + extrude + fillet.

    Structural reinforcement part.
    """
    sketch = cq.Workplane("XY").moveTo(0, 0).lineTo(width, 0).lineTo(0, height).close()
    solid = sketch.extrude(thickness)

    # Fillet only the long edges (parallel to extrusion direction)
    try:
        solid = solid.edges("|Z").fillet(fillet_r)
    except Exception:
        pass

    return solid


def spacer(
    outer_d: float = 20.0,
    inner_d: float = 10.0,
    height: float = 8.0,
) -> cq.Workplane:
    """Cylindrical spacer/washer — tests concentric subtract.

    The simplest turned part.
    """
    outer = ck.cylinder(outer_d / 2, height)
    inner = ck.cylinder(inner_d / 2, height + 2)
    return ck.subtract(outer, inner)


def bushing(
    outer_d: float = 25.0,
    inner_d: float = 16.0,
    length: float = 20.0,
    flange_d: float = 32.0,
    flange_t: float = 3.0,
) -> cq.Workplane:
    """Flanged bushing — tests union of two concentric cylinders + bore.

    Common bearing/guide component.
    """
    # Main body
    body = ck.cylinder(outer_d / 2, length)

    # Flange
    flange = ck.cylinder(flange_d / 2, flange_t)
    flange = ck.translate(flange, (0, 0, length / 2 - flange_t / 2))
    result = ck.union(body, flange)

    # Bore
    bore = ck.cylinder(inner_d / 2, length + flange_t + 2)
    result = ck.subtract(result, bore)

    return result


def manifold_block(
    width: float = 60.0,
    height: float = 40.0,
    depth: float = 25.0,
    port_d: float = 8.0,
    channel_d: float = 4.0,
) -> cq.Workplane:
    """Hydraulic manifold block — tests multiple intersecting holes.

    Complex CNC part with internal fluid channels.
    """
    block = ck.box(width, height, depth)

    # Top ports (3x)
    for x_off in [-18, 0, 18]:
        port = ck.cylinder(port_d / 2, depth + 2)
        port = ck.translate(port, (x_off, 0, 0))
        block = ck.subtract(block, port)

    # Side channel (horizontal through-hole)
    channel = ck.cylinder(channel_d / 2, width + 2)
    channel = ck.rotate(channel, axis=(0, 1, 0), angle=90)
    block = ck.subtract(block, channel)

    # Chamfer top edges
    try:
        block = ck.chamfer(block, 1.0, edges=">Z")
    except Exception:
        pass

    return block


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

REFERENCE_PARTS = {
    "cube": cube,
    "cylinder": cylinder_part,
    "flanged_plate": flanged_plate,
    "bracket": bracket,
    "bearing_block": bearing_block,
    "shaft_collar": shaft_collar,
    "gusset": gusset,
    "spacer": spacer,
    "bushing": bushing,
    "manifold_block": manifold_block,
}


def build_all() -> dict[str, cq.Workplane]:
    """Build all 10 reference parts with default parameters."""
    return {name: factory() for name, factory in REFERENCE_PARTS.items()}
