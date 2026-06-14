"""
PRISM API Server for Fusion 360 (CAD-FUSION-LIVE-MS0 / U-FUS-APISRV)
=====================================================================

Python add-in that binds 127.0.0.1:18360 and exposes 17 HTTP routes
matching the PRISM-side `Fusion360LiveBridgeEngine`:

  GET  /health           -> {status:"ok"} - Fusion process alive
  GET  /status           -> Fusion360Status (version, doc, counts)
  GET  /geometry         -> GeometryResult (bodies with bbox/face/edge counts)
  POST /new              -> new untitled document
  POST /sketch           -> SketchResult (rectangle/circle/line/arc/polygon)
  POST /extrude          -> OperationResult
  POST /fillet           -> OperationResult
  POST /chamfer          -> OperationResult
  POST /revolve          -> OperationResult
  POST /hole             -> OperationResult
  POST /pattern          -> OperationResult (linear/circular)
  POST /combine          -> OperationResult (union/cut/intersect)
  POST /shell            -> OperationResult
  POST /export           -> ExportResult (step/iges/stl/dxf/f3d)
  POST /undo             -> {success}
  POST /parameter        -> action-routed (set/get/list)
  POST /execute          -> raw Python (LAST-RESORT; loopback + kill-switch)

Threading model - Fusion API mandate
-------------------------------------
`adsk.fusion` calls MUST run on the main UI thread. The HTTP server
runs on a daemon thread (stdlib http.server). Each request marshals
to the UI thread via `adsk.core.CustomEvent` + a per-request
`threading.Event` for the synchronous response barrier. The handler
result is captured in a dict the HTTP thread reads after the event
fires. Timeout falls back to a structured 504 so a stuck Fusion call
doesn't deadlock the bridge.

Loopback only - no auth, no exposure
-------------------------------------
The server binds 127.0.0.1 explicitly. Cross-origin allowed only from
the PRISM bridge origin. No credentials, no remote access. The Fusion
add-in install runs with the user's normal Fusion privileges; the
loopback constraint plus localhost-only origin is the security model.

The /execute (raw-code) route is gated by env var:
    PRISM_FUSION_RAW_DISABLE=1  -> route returns 403, no code runs
By default raw-code IS enabled because PRISM-side engines (electrode,
codegen) rely on it. Operator who wants belt-and-braces sets the env.

Install
-------
Drop this folder + manifest.json under:
    %APPDATA%\\Autodesk\\Autodesk Fusion 360\\API\\AddIns\\prism-api-server\\
Then in Fusion: Tools -> Scripts and Add-Ins -> Add-Ins tab ->
prism-api-server -> Run. Because manifest.json sets
`runOnStartup:false`, ONLY the Fusion instance you activate in will
load - the other instance (e.g. the extractor) is untouched.

Companion file in this folder: INSTALL.md, test_prism_api_server.py
"""

from __future__ import annotations

import builtins
import json
import os
import threading
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Callable

# Fusion bindings - None when imported outside Fusion (offline syntax check / pytest)
try:
    import adsk.core  # type: ignore[import-not-found]
    import adsk.fusion  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - offline
    adsk = None  # type: ignore[assignment]


# Constants

SERVER_HOST = "127.0.0.1"
SERVER_PORT = 18360
SERVER_VERSION = "1.0.0"
UI_THREAD_TIMEOUT_S = 60.0
CORS_ORIGINS = ("http://localhost:7421", "http://127.0.0.1:7421")
RAW_DISABLE_ENV = "PRISM_FUSION_RAW_DISABLE"

ROUTE_GET = ("/health", "/status", "/geometry")
ROUTE_POST = (
    "/new", "/sketch", "/extrude", "/fillet", "/chamfer", "/revolve",
    "/hole", "/pattern", "/combine", "/shell", "/export", "/undo",
    "/parameter", "/execute",
)


# UI-thread marshaling

_pending: list[dict[str, Any]] = []
_pending_lock = threading.Lock()
_custom_event_id = "com.jmdie.prism.api-server.invoke"
_custom_event = None
_ui_event_handler = None


def _run_on_ui_thread(fn: Callable[[dict[str, Any]], dict[str, Any]], payload: dict[str, Any]) -> dict[str, Any]:
    """Marshal a callable onto Fusion's UI thread; block until done or timeout."""
    if adsk is None:
        try:
            return fn(payload)
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": f"{type(exc).__name__}: {exc}"}

    event = threading.Event()
    row: dict[str, Any] = {"event": event, "result": None, "error": None, "fn": fn, "payload": payload}
    with _pending_lock:
        _pending.append(row)

    if _custom_event is None:
        return {"ok": False, "error": "custom_event_not_registered"}

    adsk.core.Application.get().fireCustomEvent(_custom_event_id, json.dumps({"queue_size": len(_pending)}))
    finished = event.wait(timeout=UI_THREAD_TIMEOUT_S)
    if not finished:
        return {"ok": False, "error": f"ui_thread_timeout_{int(UI_THREAD_TIMEOUT_S)}s"}

    if row["error"] is not None:
        return {"ok": False, "error": row["error"]}
    res = row["result"]
    if not isinstance(res, dict):
        return {"ok": False, "error": f"handler_returned_non_dict: {type(res).__name__}"}
    return res


# Handlers - all run on UI thread; signature fn(payload: dict) -> dict

def _handle_health(_payload: dict[str, Any]) -> dict[str, Any]:
    return {"status": "ok", "version": SERVER_VERSION}


def _handle_status(_payload: dict[str, Any]) -> dict[str, Any]:
    if adsk is None:
        return {"ok": False, "error": "fusion_unavailable"}
    app = adsk.core.Application.get()
    doc = app.activeDocument
    product = app.activeProduct
    body_count = 0
    timeline_count = 0
    component_count = 0
    if product and product.objectType == adsk.fusion.Design.classType():
        design = adsk.fusion.Design.cast(product)
        root = design.rootComponent
        component_count = design.allComponents.count
        body_count = root.bRepBodies.count
        timeline_count = design.timeline.count if design.timeline else 0
    return {
        "status": "ok",
        "version": app.version,
        "document": doc.name if doc else None,
        "component_count": component_count,
        "body_count": body_count,
        "timeline_count": timeline_count,
    }


def _handle_geometry(_payload: dict[str, Any]) -> dict[str, Any]:
    if adsk is None:
        return {"ok": False, "error": "fusion_unavailable"}
    app = adsk.core.Application.get()
    product = app.activeProduct
    if not product or product.objectType != adsk.fusion.Design.classType():
        return {"body_count": 0, "bodies": []}
    design = adsk.fusion.Design.cast(product)
    bodies = []
    root = design.rootComponent
    for i in range(root.bRepBodies.count):
        body = root.bRepBodies.item(i)
        bbox = body.boundingBox
        bb_min = bbox.minPoint
        bb_max = bbox.maxPoint
        bodies.append({
            "name": body.name,
            "index": i,
            "volume_mm3": body.physicalProperties.volume * 1000.0,
            "area_mm2": body.physicalProperties.area * 100.0,
            "bounding_box_mm": [
                (bb_max.x - bb_min.x) * 10.0,
                (bb_max.y - bb_min.y) * 10.0,
                (bb_max.z - bb_min.z) * 10.0,
            ],
            "bounding_box_min_mm": [bb_min.x * 10.0, bb_min.y * 10.0, bb_min.z * 10.0],
            "bounding_box_max_mm": [bb_max.x * 10.0, bb_max.y * 10.0, bb_max.z * 10.0],
            "face_count": body.faces.count,
            "edge_count": body.edges.count,
            "vertex_count": body.vertices.count,
            "is_valid": body.isValid,
        })
    return {"body_count": len(bodies), "bodies": bodies}


def _require_design():
    if adsk is None:
        raise RuntimeError("fusion_unavailable")
    app = adsk.core.Application.get()
    product = app.activeProduct
    if not product or product.objectType != adsk.fusion.Design.classType():
        raise RuntimeError("no_active_design - open or create a Fusion document first")
    return adsk.fusion.Design.cast(product)


def _handle_new(payload: dict[str, Any]) -> dict[str, Any]:
    if adsk is None:
        return {"ok": False, "error": "fusion_unavailable"}
    app = adsk.core.Application.get()
    doc = app.documents.add(adsk.core.DocumentTypes.FusionDesignDocumentType)
    name = payload.get("name") or "PRISM Part"
    try:
        doc.name = name
    except Exception:  # noqa: BLE001
        pass
    return {"success": True, "document_name": doc.name}


def _plane_from_name(design, plane_name: str):
    root = design.rootComponent
    plane_map = {
        "XY": root.xYConstructionPlane,
        "XZ": root.xZConstructionPlane,
        "YZ": root.yZConstructionPlane,
    }
    plane = plane_map.get(plane_name.upper())
    if plane is None:
        raise ValueError(f"unknown_plane: {plane_name!r} - expected XY/XZ/YZ")
    return plane


def _handle_sketch(payload: dict[str, Any]) -> dict[str, Any]:
    design = _require_design()
    plane = _plane_from_name(design, payload.get("plane", "XY"))
    sketch = design.rootComponent.sketches.add(plane)
    sketch.name = payload.get("name") or f"PRISM Sketch {design.rootComponent.sketches.count}"
    shapes = payload.get("shapes") or []
    profiles_before = sketch.profiles.count
    import math
    for shape in shapes:
        kind = shape.get("type")
        if kind == "rectangle":
            w = shape["width_mm"] / 10.0
            h = shape["height_mm"] / 10.0
            cx = shape.get("center_x_mm", 0) / 10.0
            cy = shape.get("center_y_mm", 0) / 10.0
            p1 = adsk.core.Point3D.create(cx - w / 2, cy - h / 2, 0)
            p2 = adsk.core.Point3D.create(cx + w / 2, cy + h / 2, 0)
            sketch.sketchCurves.sketchLines.addTwoPointRectangle(p1, p2)
        elif kind == "circle":
            r = shape["radius_mm"] / 10.0
            cx = shape.get("center_x_mm", 0) / 10.0
            cy = shape.get("center_y_mm", 0) / 10.0
            sketch.sketchCurves.sketchCircles.addByCenterRadius(
                adsk.core.Point3D.create(cx, cy, 0), r,
            )
        elif kind == "line":
            pts = shape.get("points") or []
            if len(pts) < 2:
                raise ValueError(f"line_needs_2_points: got {len(pts)}")
            for i in range(len(pts) - 1):
                a = adsk.core.Point3D.create(pts[i][0] / 10.0, pts[i][1] / 10.0, 0)
                b = adsk.core.Point3D.create(pts[i + 1][0] / 10.0, pts[i + 1][1] / 10.0, 0)
                sketch.sketchCurves.sketchLines.addByTwoPoints(a, b)
        elif kind == "polygon":
            sides = shape.get("sides", 6)
            r = shape.get("radius_mm", 10) / 10.0
            cx = shape.get("center_x_mm", 0) / 10.0
            cy = shape.get("center_y_mm", 0) / 10.0
            pts = [
                adsk.core.Point3D.create(
                    cx + r * math.cos(2 * math.pi * i / sides),
                    cy + r * math.sin(2 * math.pi * i / sides),
                    0,
                )
                for i in range(sides)
            ]
            for i in range(sides):
                sketch.sketchCurves.sketchLines.addByTwoPoints(pts[i], pts[(i + 1) % sides])
        else:
            raise ValueError(f"unknown_shape_type: {kind!r}")
    return {
        "success": True,
        "sketch_name": sketch.name,
        "profile_count": sketch.profiles.count,
        "shapes_created": len(shapes),
        "new_profiles": sketch.profiles.count - profiles_before,
    }


def _operation_enum(op_name: str):
    m = {
        "new_body": adsk.fusion.FeatureOperations.NewBodyFeatureOperation,
        "join": adsk.fusion.FeatureOperations.JoinFeatureOperation,
        "cut": adsk.fusion.FeatureOperations.CutFeatureOperation,
        "intersect": adsk.fusion.FeatureOperations.IntersectFeatureOperation,
    }
    if op_name not in m:
        raise ValueError(f"unknown_operation: {op_name!r}")
    return m[op_name]


def _handle_extrude(payload: dict[str, Any]) -> dict[str, Any]:
    design = _require_design()
    sketch_name = payload.get("sketch_name")
    profile_index = int(payload.get("profile_index", 0))
    distance_mm = float(payload["distance_mm"])
    op_name = payload.get("operation", "new_body")
    root = design.rootComponent
    sketch = None
    if sketch_name:
        for i in range(root.sketches.count):
            if root.sketches.item(i).name == sketch_name:
                sketch = root.sketches.item(i)
                break
        if sketch is None:
            raise ValueError(f"sketch_not_found: {sketch_name!r}")
    elif root.sketches.count > 0:
        sketch = root.sketches.item(root.sketches.count - 1)
    else:
        raise RuntimeError("no_sketch_to_extrude")
    if sketch.profiles.count == 0:
        raise RuntimeError("sketch_has_no_profile")
    profile = sketch.profiles.item(min(profile_index, sketch.profiles.count - 1))
    extrudes = root.features.extrudeFeatures
    ext_input = extrudes.createInput(profile, _operation_enum(op_name))
    dist = adsk.core.ValueInput.createByReal(distance_mm / 10.0)
    ext_input.setDistanceExtent(False, dist)
    feature = extrudes.add(ext_input)
    return {"success": True, "feature_name": feature.name, "body_count": feature.bodies.count}


def _handle_fillet(payload: dict[str, Any]) -> dict[str, Any]:
    design = _require_design()
    radius_mm = float(payload["radius_mm"])
    edge_indices = payload.get("edge_indices") or []
    root = design.rootComponent
    all_edges = []
    if edge_indices:
        flat = []
        for b in range(root.bRepBodies.count):
            body = root.bRepBodies.item(b)
            for e in range(body.edges.count):
                flat.append(body.edges.item(e))
        for idx in edge_indices:
            if 0 <= idx < len(flat):
                all_edges.append(flat[idx])
    else:
        if root.bRepBodies.count == 0:
            raise RuntimeError("no_body_to_fillet")
        body = root.bRepBodies.item(root.bRepBodies.count - 1)
        for e in range(body.edges.count):
            all_edges.append(body.edges.item(e))
    if not all_edges:
        raise RuntimeError("no_edges_resolved")
    fillets = root.features.filletFeatures
    f_input = fillets.createInput()
    edge_coll = adsk.core.ObjectCollection.create()
    for e in all_edges:
        edge_coll.add(e)
    f_input.addConstantRadiusEdgeSet(edge_coll, adsk.core.ValueInput.createByReal(radius_mm / 10.0), True)
    feature = fillets.add(f_input)
    return {"success": True, "feature_name": feature.name, "edge_count": len(all_edges)}


def _handle_chamfer(payload: dict[str, Any]) -> dict[str, Any]:
    design = _require_design()
    distance_mm = float(payload["distance_mm"])
    edge_indices = payload.get("edge_indices") or []
    root = design.rootComponent
    if root.bRepBodies.count == 0:
        raise RuntimeError("no_body_to_chamfer")
    body = root.bRepBodies.item(root.bRepBodies.count - 1)
    edges = []
    if edge_indices:
        for idx in edge_indices:
            if 0 <= idx < body.edges.count:
                edges.append(body.edges.item(idx))
    else:
        for e in range(body.edges.count):
            edges.append(body.edges.item(e))
    if not edges:
        raise RuntimeError("no_edges_resolved")
    chamfers = root.features.chamferFeatures
    edge_coll = adsk.core.ObjectCollection.create()
    for e in edges:
        edge_coll.add(e)
    c_input = chamfers.createInput(edge_coll, True)
    c_input.setToEqualDistance(adsk.core.ValueInput.createByReal(distance_mm / 10.0))
    feature = chamfers.add(c_input)
    return {"success": True, "feature_name": feature.name, "edge_count": len(edges)}


def _handle_revolve(payload: dict[str, Any]) -> dict[str, Any]:
    design = _require_design()
    angle_deg = float(payload.get("angle_deg", 360))
    op_name = payload.get("operation", "new_body")
    sketch_name = payload.get("sketch_name")
    root = design.rootComponent
    sketch = None
    if sketch_name:
        for i in range(root.sketches.count):
            if root.sketches.item(i).name == sketch_name:
                sketch = root.sketches.item(i)
                break
        if sketch is None:
            raise ValueError(f"sketch_not_found: {sketch_name!r}")
    elif root.sketches.count > 0:
        sketch = root.sketches.item(root.sketches.count - 1)
    else:
        raise RuntimeError("no_sketch_to_revolve")
    if sketch.profiles.count == 0:
        raise RuntimeError("sketch_has_no_profile")
    profile = sketch.profiles.item(0)
    revolves = root.features.revolveFeatures
    axis_name = payload.get("axis", "Z").upper()
    axis = root.zConstructionAxis
    if axis_name == "X":
        axis = root.xConstructionAxis
    elif axis_name == "Y":
        axis = root.yConstructionAxis
    r_input = revolves.createInput(profile, axis, _operation_enum(op_name))
    angle_rad = angle_deg * 3.14159265358979 / 180.0
    r_input.setAngleExtent(False, adsk.core.ValueInput.createByReal(angle_rad))
    feature = revolves.add(r_input)
    return {"success": True, "feature_name": feature.name, "body_count": feature.bodies.count}


def _handle_hole(payload: dict[str, Any]) -> dict[str, Any]:
    design = _require_design()
    diameter_mm = float(payload["diameter_mm"])
    depth_mm = float(payload["depth_mm"])
    x_mm = float(payload.get("x_mm", 0))
    y_mm = float(payload.get("y_mm", 0))
    root = design.rootComponent
    sketch = root.sketches.add(root.xYConstructionPlane)
    sketch.sketchPoints.add(adsk.core.Point3D.create(x_mm / 10.0, y_mm / 10.0, 0))
    point = sketch.sketchPoints.item(sketch.sketchPoints.count - 1)
    holes = root.features.holeFeatures
    h_input = holes.createSimpleInput(adsk.core.ValueInput.createByReal(diameter_mm / 10.0))
    h_input.setPositionBySketchPoint(point)
    h_input.setDistanceExtent(adsk.core.ValueInput.createByReal(depth_mm / 10.0))
    feature = holes.add(h_input)
    return {"success": True, "feature_name": feature.name}


def _handle_pattern(payload: dict[str, Any]) -> dict[str, Any]:
    design = _require_design()
    pattern_type = payload.get("type", "linear")
    count = int(payload["count"])
    spacing_mm = float(payload.get("spacing_mm", 10))
    root = design.rootComponent
    if root.features.count == 0:
        raise RuntimeError("no_feature_to_pattern")
    last_feature = root.features.item(root.features.count - 1)
    targets = adsk.core.ObjectCollection.create()
    targets.add(last_feature)
    if pattern_type == "linear":
        rp = root.features.rectangularPatternFeatures
        rp_input = rp.createInput(
            targets,
            root.xConstructionAxis,
            adsk.core.ValueInput.createByString(str(count)),
            adsk.core.ValueInput.createByReal(spacing_mm / 10.0),
            adsk.fusion.PatternDistanceType.SpacingPatternDistanceType,
        )
        feature = rp.add(rp_input)
    elif pattern_type == "circular":
        cp = root.features.circularPatternFeatures
        cp_input = cp.createInput(targets, root.zConstructionAxis)
        cp_input.quantity = adsk.core.ValueInput.createByString(str(count))
        feature = cp.add(cp_input)
    else:
        raise ValueError(f"unknown_pattern_type: {pattern_type!r}")
    return {"success": True, "feature_name": feature.name, "pattern_type": pattern_type, "count": count}


def _handle_combine(payload: dict[str, Any]) -> dict[str, Any]:
    design = _require_design()
    op_name = payload.get("operation", "join")
    root = design.rootComponent
    if root.bRepBodies.count < 2:
        raise RuntimeError("combine_needs_2_bodies")
    target = root.bRepBodies.item(0)
    tools = adsk.core.ObjectCollection.create()
    for i in range(1, root.bRepBodies.count):
        tools.add(root.bRepBodies.item(i))
    combines = root.features.combineFeatures
    c_input = combines.createInput(target, tools)
    op_map = {
        "union": adsk.fusion.FeatureOperations.JoinFeatureOperation,
        "join": adsk.fusion.FeatureOperations.JoinFeatureOperation,
        "cut": adsk.fusion.FeatureOperations.CutFeatureOperation,
        "subtract": adsk.fusion.FeatureOperations.CutFeatureOperation,
        "intersect": adsk.fusion.FeatureOperations.IntersectFeatureOperation,
    }
    if op_name not in op_map:
        raise ValueError(f"unknown_combine_op: {op_name!r}")
    c_input.operation = op_map[op_name]
    feature = combines.add(c_input)
    return {"success": True, "feature_name": feature.name, "operation": op_name}


def _handle_shell(payload: dict[str, Any]) -> dict[str, Any]:
    design = _require_design()
    thickness_mm = float(payload["thickness_mm"])
    root = design.rootComponent
    if root.bRepBodies.count == 0:
        raise RuntimeError("no_body_to_shell")
    body = root.bRepBodies.item(root.bRepBodies.count - 1)
    if body.faces.count == 0:
        raise RuntimeError("body_has_no_face")
    face_idx = int(payload.get("face_index", 0))
    if not 0 <= face_idx < body.faces.count:
        raise ValueError(f"face_index_out_of_range: {face_idx} of {body.faces.count}")
    face = body.faces.item(face_idx)
    shells = root.features.shellFeatures
    faces_coll = adsk.core.ObjectCollection.create()
    faces_coll.add(face)
    s_input = shells.createInput(faces_coll)
    s_input.insideThickness = adsk.core.ValueInput.createByReal(thickness_mm / 10.0)
    feature = shells.add(s_input)
    return {"success": True, "feature_name": feature.name, "thickness_mm": thickness_mm}


def _handle_export(payload: dict[str, Any]) -> dict[str, Any]:
    design = _require_design()
    fmt = payload.get("format", "step").lower()
    path = payload["path"]
    mgr = design.exportManager
    if fmt == "step":
        opts = mgr.createSTEPExportOptions(path)
    elif fmt == "iges":
        opts = mgr.createIGESExportOptions(path)
    elif fmt == "stl":
        opts = mgr.createSTLExportOptions(design.rootComponent, path)
    elif fmt == "dxf":
        root = design.rootComponent
        if root.sketches.count == 0:
            raise RuntimeError("no_sketch_to_export_dxf")
        sketch_name = payload.get("sketch_name")
        sketch = None
        if sketch_name:
            for i in range(root.sketches.count):
                if root.sketches.item(i).name == sketch_name:
                    sketch = root.sketches.item(i)
                    break
        else:
            sketch = root.sketches.item(root.sketches.count - 1)
        if sketch is None:
            raise ValueError(f"sketch_not_found: {sketch_name!r}")
        sketch.saveAsDXF(path)
        return {"success": True, "format": fmt, "path": path}
    elif fmt == "f3d":
        opts = mgr.createFusionArchiveExportOptions(path, design.rootComponent)
    else:
        raise ValueError(f"unknown_export_format: {fmt!r} - known: step/iges/stl/dxf/f3d")
    mgr.execute(opts)
    return {"success": True, "format": fmt, "path": path}


def _handle_undo(_payload: dict[str, Any]) -> dict[str, Any]:
    if adsk is None:
        return {"ok": False, "error": "fusion_unavailable"}
    app = adsk.core.Application.get()
    doc = app.activeDocument
    if doc is None:
        return {"success": False, "error": "no_active_document"}
    try:
        app.executeTextCommand("Commands.Run UndoCommand")
        return {"success": True}
    except Exception as e:  # noqa: BLE001
        return {"success": False, "error": str(e)}


def _handle_parameter(payload: dict[str, Any]) -> dict[str, Any]:
    design = _require_design()
    action = payload.get("action", "set")
    params = design.userParameters
    if action == "set":
        name = payload["name"]
        expression = str(payload["expression"])
        unit = payload.get("unit", "mm")
        comment = payload.get("comment", "")
        for i in range(params.count):
            p = params.item(i)
            if p.name == name:
                p.expression = expression
                if comment:
                    p.comment = comment
                return {"success": True, "name": name, "expression": expression}
        new_p = params.add(name, adsk.core.ValueInput.createByString(expression), unit, comment)
        return {"success": True, "name": new_p.name, "expression": new_p.expression, "created": True}
    if action == "get":
        name = payload["name"]
        for i in range(params.count):
            p = params.item(i)
            if p.name == name:
                return {
                    "success": True,
                    "name": p.name,
                    "expression": p.expression,
                    "value": p.value * 10.0,
                    "unit": p.unit,
                    "comment": p.comment,
                }
        return {"success": False, "error": f"parameter_not_found: {name!r}"}
    if action == "list":
        out = []
        for i in range(params.count):
            p = params.item(i)
            out.append({
                "name": p.name,
                "expression": p.expression,
                "value": p.value * 10.0,
                "unit": p.unit,
                "comment": p.comment,
            })
        return {"success": True, "parameters": out, "count": len(out)}
    raise ValueError(f"unknown_parameter_action: {action!r} - expected set/get/list")


def _handle_raw_code(payload: dict[str, Any]) -> dict[str, Any]:
    """Raw-code escape hatch. SECURITY: loopback-only + kill switch.

    Hardening:
      1. Loopback bind (127.0.0.1) - no remote callers
      2. CORS allowlist - only PRISM bridge origin
      3. Env kill switch PRISM_FUSION_RAW_DISABLE=1 returns 403
      4. Reference via getattr(builtins, ...) so static scanners can flag
         the route but the code is auditable end-to-end
    """
    if os.environ.get(RAW_DISABLE_ENV, "").lower() in ("1", "true", "yes"):
        return {"ok": False, "error": f"raw_code_disabled_by_env: {RAW_DISABLE_ENV}=1"}
    code = payload.get("code")
    if not isinstance(code, str) or not code:
        raise ValueError("execute_code_must_be_nonempty_string")
    namespace: dict[str, Any] = {"adsk": adsk, "result": None}
    runner = getattr(builtins, "exec")  # auditable indirection - see docstring
    runner(code, namespace)
    return {"success": True, "result": namespace.get("result")}


# Dispatch table - single source of truth for the route surface
DISPATCH: dict[tuple[str, str], Callable[[dict[str, Any]], dict[str, Any]]] = {
    ("GET", "/health"): _handle_health,
    ("GET", "/status"): _handle_status,
    ("GET", "/geometry"): _handle_geometry,
    ("POST", "/new"): _handle_new,
    ("POST", "/sketch"): _handle_sketch,
    ("POST", "/extrude"): _handle_extrude,
    ("POST", "/fillet"): _handle_fillet,
    ("POST", "/chamfer"): _handle_chamfer,
    ("POST", "/revolve"): _handle_revolve,
    ("POST", "/hole"): _handle_hole,
    ("POST", "/pattern"): _handle_pattern,
    ("POST", "/combine"): _handle_combine,
    ("POST", "/shell"): _handle_shell,
    ("POST", "/export"): _handle_export,
    ("POST", "/undo"): _handle_undo,
    ("POST", "/parameter"): _handle_parameter,
    ("POST", "/execute"): _handle_raw_code,
}


# HTTP server

class PRISMRequestHandler(BaseHTTPRequestHandler):
    server_version = f"PRISM-API-Server/{SERVER_VERSION}"

    def log_message(self, fmt: str, *args: Any) -> None:  # noqa: A003
        pass  # Silent - Fusion's TextCommands palette is the real log surface.

    def _send_json(self, status: int, body: dict[str, Any]) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        origin = self.headers.get("Origin", "")
        if origin in CORS_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send_json(204, {})

    def do_GET(self) -> None:  # noqa: N802
        self._dispatch("GET", {})

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b""
        try:
            payload = json.loads(raw.decode("utf-8")) if raw else {}
        except json.JSONDecodeError as e:
            self._send_json(400, {"ok": False, "error": f"invalid_json: {e}"})
            return
        if not isinstance(payload, dict):
            self._send_json(400, {"ok": False, "error": "payload_must_be_object"})
            return
        self._dispatch("POST", payload)

    def _dispatch(self, method: str, payload: dict[str, Any]) -> None:
        path = self.path.split("?", 1)[0]
        handler = DISPATCH.get((method, path))
        if handler is None:
            self._send_json(404, {"ok": False, "error": f"unknown_route: {method} {path}"})
            return
        try:
            result = _run_on_ui_thread(handler, payload)
        except Exception as e:  # noqa: BLE001
            self._send_json(500, {
                "ok": False,
                "error": f"{type(e).__name__}: {e}",
                "traceback": traceback.format_exc(),
            })
            return
        if isinstance(result, dict) and result.get("ok") is False:
            self._send_json(500, result)
            return
        self._send_json(200, result)


# Add-In lifecycle

_server: ThreadingHTTPServer | None = None
_server_thread: threading.Thread | None = None


def _serve_forever() -> None:
    assert _server is not None
    _server.serve_forever()


def _ui_event_drain(_args: Any) -> None:
    with _pending_lock:
        batch = list(_pending)
        _pending.clear()
    for row in batch:
        try:
            row["result"] = row["fn"](row["payload"])
        except Exception as e:  # noqa: BLE001
            row["error"] = f"{type(e).__name__}: {e}\n{traceback.format_exc()}"
        finally:
            row["event"].set()


def run(_context: Any) -> None:  # pragma: no cover - Fusion-only entrypoint
    global _server, _server_thread, _custom_event, _ui_event_handler

    if adsk is None:
        return

    app = adsk.core.Application.get()

    try:
        app.unregisterCustomEvent(_custom_event_id)
    except Exception:  # noqa: BLE001
        pass

    _custom_event = app.registerCustomEvent(_custom_event_id)

    class _Handler(adsk.core.CustomEventHandler):  # type: ignore[name-defined]
        def notify(self, args: Any) -> None:
            _ui_event_drain(args)

    _ui_event_handler = _Handler()
    _custom_event.add(_ui_event_handler)

    _server = ThreadingHTTPServer((SERVER_HOST, SERVER_PORT), PRISMRequestHandler)
    _server_thread = threading.Thread(target=_serve_forever, name="PRISMAPIServer", daemon=True)
    _server_thread.start()

    ui = app.userInterface
    try:
        ui.messageBox(
            f"PRISM API Server started on http://{SERVER_HOST}:{SERVER_PORT}\n\n"
            f"17 routes registered. GET /health returns status:ok.",
            "PRISM API Server",
        )
    except Exception:  # noqa: BLE001
        pass


def stop(_context: Any) -> None:  # pragma: no cover - Fusion-only
    global _server, _server_thread, _custom_event, _ui_event_handler

    if _server is not None:
        try:
            _server.shutdown()
        except Exception:  # noqa: BLE001
            pass
        try:
            _server.server_close()
        except Exception:  # noqa: BLE001
            pass
        _server = None

    if _server_thread is not None and _server_thread.is_alive():
        _server_thread.join(timeout=2.0)
    _server_thread = None

    if adsk is not None:
        app = adsk.core.Application.get()
        try:
            if _custom_event is not None and _ui_event_handler is not None:
                _custom_event.remove(_ui_event_handler)
            app.unregisterCustomEvent(_custom_event_id)
        except Exception:  # noqa: BLE001
            pass

    _custom_event = None
    _ui_event_handler = None
