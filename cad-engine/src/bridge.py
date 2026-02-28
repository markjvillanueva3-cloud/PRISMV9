"""JSON-RPC bridge — stdin/stdout communication for TypeScript subprocess.

Protocol: one JSON object per line on stdin, one JSON response per line on stdout.
Request:  {"jsonrpc": "2.0", "method": "...", "params": {...}, "id": 1}
Response: {"jsonrpc": "2.0", "result": {...}, "id": 1}
Error:    {"jsonrpc": "2.0", "error": {"code": -1, "message": "..."}, "id": 1}

Methods:
  ping                → {"status": "ok"}
  create_geometry     → create primitive/sketch/feature geometry
  validate_geometry   → run geometry validation checks
  export_geometry     → export solid to STEP/STL/IGES/DXF
  import_step         → import STEP file into CadQuery solid
  analyze_geometry    → volume, surface area, bounding box, CoM
"""

from __future__ import annotations

import json
import sys
import os
import traceback
import threading
from typing import Any, Optional

# Ensure src/ is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cad_kernel as ck
import geo_validator as gv
import cad_export as ce

# ---------------------------------------------------------------------------
# Error codes (JSON-RPC standard + custom)
# ---------------------------------------------------------------------------

ERR_PARSE = -32700
ERR_INVALID_REQUEST = -32600
ERR_METHOD_NOT_FOUND = -32601
ERR_INVALID_PARAMS = -32602
ERR_INTERNAL = -32603
ERR_CAD_OPERATION = -1
ERR_TIMEOUT = -2

# ---------------------------------------------------------------------------
# Geometry store — keeps solids in memory between calls
# ---------------------------------------------------------------------------

_solids: dict[str, Any] = {}
_next_id = 1


def _store_solid(solid, name: str = "") -> str:
    """Store a solid and return its ID."""
    global _next_id
    sid = f"solid_{_next_id}"
    _next_id += 1
    _solids[sid] = solid
    return sid


def _get_solid(solid_id: str):
    """Retrieve a stored solid by ID."""
    if solid_id not in _solids:
        raise ck.CadKernelError(f"Unknown solid ID: {solid_id}")
    return _solids[solid_id]


# ---------------------------------------------------------------------------
# Method handlers
# ---------------------------------------------------------------------------

def handle_ping(params: dict) -> dict:
    """Health check."""
    return {"status": "ok", "version": "0.1.0", "solids_in_memory": len(_solids)}


def handle_create_geometry(params: dict) -> dict:
    """Create geometry and store it.

    Supported types: box, cylinder, sphere, cone, sketch_extrude
    """
    geo_type = params.get("type", "box")

    if geo_type == "box":
        solid = ck.box(
            params.get("width", 10),
            params.get("height", 10),
            params.get("depth", 10),
            centered=params.get("centered", True),
        )
    elif geo_type == "cylinder":
        solid = ck.cylinder(
            params.get("radius", 5),
            params.get("height", 10),
            centered=params.get("centered", True),
        )
    elif geo_type == "sphere":
        solid = ck.sphere(params.get("radius", 5))
    elif geo_type == "cone":
        solid = ck.cone(
            params.get("radius_bottom", 5),
            params.get("radius_top", 0),
            params.get("height", 10),
        )
    elif geo_type == "sketch_extrude":
        sketch = ck.create_sketch(
            shape=params.get("shape", "rectangle"),
            width=params.get("width", 10),
            height=params.get("height", 10),
            radius=params.get("radius", 5),
            sides=params.get("sides", 6),
        )
        solid = ck.extrude(sketch, params.get("extrude_height", 10))
    else:
        raise ck.CadKernelError(f"Unknown geometry type: {geo_type}")

    # Apply optional operations
    if "fillet_radius" in params:
        solid = ck.fillet(solid, params["fillet_radius"],
                          edges=params.get("fillet_edges"))
    if "chamfer_distance" in params:
        solid = ck.chamfer(solid, params["chamfer_distance"],
                           edges=params.get("chamfer_edges"))
    if "hole_diameter" in params:
        solid = ck.hole(solid, params["hole_diameter"],
                        depth=params.get("hole_depth"),
                        position=params.get("hole_position"))
    if "shell_thickness" in params:
        solid = ck.shell(solid, params["shell_thickness"],
                         faces_to_remove=params.get("shell_faces"))

    sid = _store_solid(solid, params.get("name", ""))
    vol = ck.volume(solid)
    bb = ck.bounding_box(solid)

    return {
        "solid_id": sid,
        "volume_mm3": vol,
        "bounding_box": {
            "min": bb.min.as_tuple(),
            "max": bb.max.as_tuple(),
            "size": bb.size.as_tuple(),
        },
    }


def handle_boolean(params: dict) -> dict:
    """Boolean operation on two stored solids."""
    op = params.get("operation", "union")
    a = _get_solid(params["solid_a"])
    b = _get_solid(params["solid_b"])

    if op == "union":
        result = ck.union(a, b)
    elif op == "subtract":
        result = ck.subtract(a, b)
    elif op == "intersect":
        result = ck.intersect(a, b)
    else:
        raise ck.CadKernelError(f"Unknown boolean operation: {op}")

    sid = _store_solid(result)
    return {"solid_id": sid, "volume_mm3": ck.volume(result)}


def handle_transform(params: dict) -> dict:
    """Transform a stored solid."""
    solid = _get_solid(params["solid_id"])
    op = params.get("operation", "translate")

    if op == "translate":
        solid = ck.translate(solid, tuple(params.get("vector", [0, 0, 0])))
    elif op == "rotate":
        solid = ck.rotate(solid, tuple(params.get("axis", [0, 0, 1])),
                          params.get("angle", 0))
    elif op == "mirror":
        solid = ck.mirror(solid, params.get("plane", "XY"))
    else:
        raise ck.CadKernelError(f"Unknown transform: {op}")

    sid = _store_solid(solid)
    return {"solid_id": sid, "volume_mm3": ck.volume(solid)}


def handle_validate_geometry(params: dict) -> dict:
    """Validate a stored solid."""
    solid = _get_solid(params["solid_id"])
    report = gv.validate_geometry(
        solid,
        min_wall_mm=params.get("min_wall_mm"),
        check_thickness=params.get("check_thickness", True),
        thickness_samples=params.get("thickness_samples", 50),
    )
    return {
        "is_valid": report.is_valid,
        "is_manifold": report.is_manifold,
        "is_watertight": report.is_watertight,
        "volume_mm3": report.volume_mm3,
        "surface_area_mm2": report.surface_area_mm2,
        "bounding_box": report.bounding_box,
        "center_of_mass": report.center_of_mass,
        "min_wall_thickness_mm": report.min_wall_thickness_mm,
        "face_count": report.face_count,
        "edge_count": report.edge_count,
        "vertex_count": report.vertex_count,
        "findings": [
            {
                "check": f.check,
                "passed": f.passed,
                "severity": f.severity.value,
                "message": f.message,
                "value": f.value,
            }
            for f in report.findings
        ],
    }


def handle_analyze_geometry(params: dict) -> dict:
    """Analyze geometry properties without full validation."""
    solid = _get_solid(params["solid_id"])
    vol = ck.volume(solid)
    sa = ck.surface_area(solid)
    bb = ck.bounding_box(solid)
    com = ck.center_of_mass(solid)
    return {
        "volume_mm3": vol,
        "surface_area_mm2": sa,
        "bounding_box": {
            "min": bb.min.as_tuple(),
            "max": bb.max.as_tuple(),
            "size": bb.size.as_tuple(),
            "center": bb.center.as_tuple(),
        },
        "center_of_mass": com.as_tuple(),
    }


def handle_export_geometry(params: dict) -> dict:
    """Export a stored solid to file."""
    solid = _get_solid(params["solid_id"])
    fmt = params.get("format", "STEP").upper()
    output_path = params["output_path"]

    if fmt == "STEP":
        result = ce.export_step(solid, output_path)
    elif fmt == "STL":
        result = ce.export_stl(solid, output_path,
                               tolerance=params.get("tolerance", 0.1),
                               binary=params.get("binary", True))
    elif fmt == "IGES":
        result = ce.export_iges(solid, output_path)
    elif fmt == "DXF":
        result = ce.export_dxf(solid, output_path)
    else:
        raise ck.CadKernelError(f"Unknown export format: {fmt}")

    return {
        "output_path": result.output_path,
        "format": result.format,
        "format_version": result.format_version,
        "file_size_bytes": result.file_size_bytes,
        "success": result.success,
    }


def handle_import_step(params: dict) -> dict:
    """Import a STEP file and store the solid."""
    solid = ce.import_step(params["input_path"])
    sid = _store_solid(solid)
    vol = solid.val().Volume()
    return {"solid_id": sid, "volume_mm3": vol}


def handle_clear(params: dict) -> dict:
    """Clear all stored solids to free memory."""
    count = len(_solids)
    _solids.clear()
    return {"cleared": count}


# ---------------------------------------------------------------------------
# Method dispatch table
# ---------------------------------------------------------------------------

METHODS = {
    "ping": handle_ping,
    "create_geometry": handle_create_geometry,
    "boolean": handle_boolean,
    "transform": handle_transform,
    "validate_geometry": handle_validate_geometry,
    "analyze_geometry": handle_analyze_geometry,
    "export_geometry": handle_export_geometry,
    "import_step": handle_import_step,
    "clear": handle_clear,
}


# ---------------------------------------------------------------------------
# JSON-RPC protocol
# ---------------------------------------------------------------------------

def make_response(result: Any, req_id: Any) -> dict:
    """Build a JSON-RPC success response."""
    return {"jsonrpc": "2.0", "result": result, "id": req_id}


def make_error(code: int, message: str, req_id: Any = None) -> dict:
    """Build a JSON-RPC error response."""
    return {"jsonrpc": "2.0", "error": {"code": code, "message": message}, "id": req_id}


def process_request(line: str) -> dict:
    """Parse and dispatch a single JSON-RPC request."""
    try:
        request = json.loads(line)
    except json.JSONDecodeError as exc:
        return make_error(ERR_PARSE, f"JSON parse error: {exc}")

    req_id = request.get("id")
    method = request.get("method")
    params = request.get("params", {})

    if not method:
        return make_error(ERR_INVALID_REQUEST, "Missing 'method' field", req_id)

    handler = METHODS.get(method)
    if not handler:
        return make_error(ERR_METHOD_NOT_FOUND, f"Unknown method: {method}", req_id)

    try:
        result = handler(params)
        return make_response(result, req_id)
    except ck.CadKernelError as exc:
        return make_error(ERR_CAD_OPERATION, str(exc), req_id)
    except gv.GeoValidatorError as exc:
        return make_error(ERR_CAD_OPERATION, str(exc), req_id)
    except ce.CadExportError as exc:
        return make_error(ERR_CAD_OPERATION, str(exc), req_id)
    except Exception as exc:
        return make_error(ERR_INTERNAL, f"{type(exc).__name__}: {exc}", req_id)


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def main() -> None:
    """Run the JSON-RPC bridge, reading from stdin, writing to stdout."""
    # Unbuffered stdout for real-time IPC
    sys.stdout.reconfigure(line_buffering=True)

    # Signal readiness
    ready_msg = json.dumps({"jsonrpc": "2.0", "method": "ready", "params": {"version": "0.1.0"}})
    sys.stdout.write(ready_msg + "\n")
    sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        response = process_request(line)
        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
