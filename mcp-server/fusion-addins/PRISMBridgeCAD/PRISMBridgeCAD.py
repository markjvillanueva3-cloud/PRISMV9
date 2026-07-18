"""
PRISM Fusion 360 API Server Add-In
===================================
Runs inside Fusion 360 as an add-in, providing HTTP API for external CAD control.

THREAD SAFETY: Fusion 360's Python API is NOT thread-safe. All adsk.* calls must
run on the main UI thread. This add-in uses a CustomEvent to dispatch requests
from the HTTP server thread to the main thread and wait for results.

Install:
  1. Copy this folder to: %APPDATA%/Autodesk/Autodesk Fusion 360/API/AddIns/PRISMBridge/
  2. In Fusion 360: Utilities -> Add-Ins -> PRISMBridge -> Run
  3. Server starts on http://localhost:18361 (was :18360; moved 2026-05-27 to avoid collision with PRISM_API_Server)

API Endpoints:
  POST /execute    -- Execute raw Python code
  POST /sketch     -- Create a sketch on a plane
  POST /extrude    -- Extrude a profile
  POST /fillet     -- Fillet edges
  POST /chamfer    -- Chamfer edges
  POST /revolve    -- Revolve a profile
  POST /hole       -- Create a hole
  POST /pattern    -- Create a pattern
  POST /combine    -- Boolean operation
  POST /shell      -- Shell faces
  POST /export     -- Export to STEP/STL/F3D
  GET  /status     -- Server status + active document info
  GET  /geometry   -- Get current body geometry metrics
  GET  /health     -- Simple health check
  POST /undo       -- Undo last operation
  POST /new        -- Create new document
  POST /parameter  -- Set/get user parameters
  POST /tool-import -- Import tools into a Fusion 360 tool library
  GET  /tool-library -- List all tool libraries
  GET  /tool-library/search -- Search tools across libraries
  DELETE /tool-library/<name> -- Remove a tool library
  GET  /cam/setups  -- List all CAM setups with metadata
  GET  /cam/setup/stock  -- Get stock definition from a setup
  GET  /cam/setup/bodies -- Get model and fixture bodies from a setup
"""
import adsk.core
import adsk.fusion
import adsk.cam
# adsk.drawing is needed for Wave L /atomic drawing.* handlers (Drawing product objects,
# ViewOrientations enum, DimensionStyles). Optional in older Fusion installs — fall back
# to None and let each drawing handler emit a fail-loud error rather than ImportError at boot.
try:
    import adsk.drawing  # type: ignore
except ImportError:
    adsk.drawing = None  # type: ignore[attr-defined]
import threading
import json
import os
import glob as globmod
import traceback
import math
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get("PRISM_BRIDGE_CAD_PORT", "18362"))  # CAD fork, default 18362 (sibling of CAM 18361). MULTI-INSTANCE ISOLATION: launch each Fusion with a DISTINCT PRISM_BRIDGE_CAD_PORT (e.g. 18365 for a 2nd instance) so each add-in binds its own port — prevents SO_REUSEADDR cross-routing onto one shared active document (slot:delta, verified 2026-06-01)
CUSTOM_EVENT_ID = "PRISMBridgeDispatchCAD"
MIN_OP_INTERVAL_S = 0.15  # 150ms cooldown between geometry operations

# Operation type mapping: PRISM type → Fusion 360 command string
OPERATION_TYPE_MAP = {
    "face_mill": "face", "pocket_2d": "pocket2d", "contour_2d": "contour2d",
    "adaptive_clear": "adaptive", "drill_peck": "drill", "chamfer": "chamfer2d",
    "thread_mill": "thread", "bore": "bore", "rest_machining": "restMachining",
    "slot": "slot", "spiral_2d": "spiral", "steep_shallow": "steepAndShallow",
    "waterline": "contour3d", "parallel_3d": "parallel", "scallop_3d": "scallop",
    "pencil_mill": "pencil", "swarf_5ax": "swarf", "multiaxis_contour": "multiAxisContour",
    "projection": "project", "radial": "radial", "circular_2d": "circular",
}

# Parameter mapping: PRISM name → (Fusion param name, conversion factor)
# Factor: 1.0 = direct, 0.1 = mm→cm
CAM_PARAM_MAP = {
    "spindle_speed_rpm": ("tool_spindleSpeed", 1.0),
    "feed_cutting_mm_min": ("tool_feedCutting", 0.1),
    "feed_ramp_mm_min": ("tool_feedEntry", 0.1),
    "feed_plunge_mm_min": ("tool_feedPlunge", 0.1),
    "max_stepdown_mm": ("maximumStepdown", 0.1),
    "max_stepover_mm": ("maximumStepover", 0.1),
    "tolerance_mm": ("tolerance", 0.1),
    "stock_to_leave_mm": ("stockToLeave", 0.1),
    "stock_to_leave_axial_mm": ("stockToLeaveAxial", 0.1),
}

# Background job tracking for async toolpath generation
_cam_jobs = {}  # job_id → {"future": GenerateToolpathFuture, "start": float, "ops": list}
_app = None
_ui = None
_server = None
_server_thread = None
_custom_event = None
_custom_event_handler = None

# Thread-safe dispatch: HTTP thread -> Fusion main thread
# The HTTP handler packages each request as JSON, fires a CustomEvent,
# and waits for the main-thread handler to store the result.
_dispatch_lock = threading.Lock()
_dispatch_event = threading.Event()
_dispatch_result = None  # JSON str set by main-thread handler


# ── Main-Thread Event Handler ────────────────────────────────────────

class _MainThreadHandler(adsk.core.CustomEventHandler):
    """Runs on Fusion 360's main thread. Executes the queued API request."""

    def __init__(self):
        super().__init__()

    def notify(self, args):
        global _dispatch_result
        try:
            event_args = adsk.core.CustomEventArgs.cast(args)
            payload = json.loads(event_args.additionalInfo)
            method = payload.get("method", "")
            path = payload.get("path", "")
            body = payload.get("body", {})
            query = payload.get("query", {})

            logic = _FusionAPILogic()
            result = logic.dispatch(method, path, body, query)

            # Let Fusion process internal events after geometry changes
            # This prevents the parametric kernel from getting corrupted
            if method == "POST" and path not in ("/parameter",):
                adsk.doEvents()

            _dispatch_result = json.dumps(result, default=str)
        except Exception as e:
            _dispatch_result = json.dumps({
                "error": str(e),
                "traceback": traceback.format_exc(),
            })
        finally:
            _dispatch_event.set()


_last_op_time = 0.0

def _run_on_main_thread(method, path, body=None, query=None):
    """Fire a CustomEvent and block until the main thread completes the work.
    Enforces a minimum interval between geometry operations to prevent
    overwhelming Fusion 360's parametric kernel."""
    global _dispatch_result, _last_op_time
    with _dispatch_lock:
        # Cooldown: wait if last geometry op was too recent
        if method == "POST":
            elapsed = time.time() - _last_op_time
            if elapsed < MIN_OP_INTERVAL_S:
                time.sleep(MIN_OP_INTERVAL_S - elapsed)

        _dispatch_event.clear()
        _dispatch_result = None
        payload = json.dumps({
            "method": method,
            "path": path,
            "body": body or {},
            "query": query or {},
        })
        app = adsk.core.Application.get()
        app.fireCustomEvent(CUSTOM_EVENT_ID, payload)
        if not _dispatch_event.wait(timeout=60):
            return {"error": "Fusion 360 main-thread dispatch timed out (60s)"}

        if method == "POST":
            _last_op_time = time.time()

        if not _dispatch_result:
            return {"error": "No result from main thread"}
        try:
            return json.loads(_dispatch_result)
        except (json.JSONDecodeError, TypeError):
            return {"error": "Corrupted response from main thread"}


# ── Fusion API Logic (runs ONLY on main thread via CustomEvent) ──────

class _FusionAPILogic:
    """All Fusion 360 API calls live here. Only called from the main thread."""

    def dispatch(self, method, path, body, query):
        try:
            if method == "GET":
                return self._dispatch_get(path, query)
            elif method == "POST":
                return self._dispatch_post(path, body)
            elif method == "DELETE":
                return self._dispatch_delete(path)
            else:
                return {"error": f"Unsupported method: {method}"}
        except Exception as e:
            return {"error": str(e), "traceback": traceback.format_exc()}

    def _dispatch_get(self, path, query):
        if path == "/status":
            return self._get_status()
        elif path == "/geometry":
            return self._get_geometry()
        elif path == "/health":
            return {"status": "ok", "port": PORT}
        elif path == "/documents":
            return self._list_documents()
        elif path == "/tool-library":
            return self._list_tool_libraries()
        elif path == "/tool-library/search":
            q = query.get("q", [""])[0] if isinstance(query.get("q"), list) else query.get("q", "")
            tool_type = query.get("type", [""])[0] if isinstance(query.get("type"), list) else query.get("type", "")
            return self._search_tool_libraries(q, tool_type)
        elif path == "/cam/setups":
            return self._get_cam_setups()
        elif path == "/cam/setup/stock":
            name = query.get("name", [""])[0] if isinstance(query.get("name"), list) else query.get("name", "")
            idx = int((query.get("index", ["0"])[0] if isinstance(query.get("index"), list) else query.get("index", "0")) or "0")
            return self._get_cam_setup_stock(name, idx)
        elif path == "/cam/setup/bodies":
            name = query.get("name", [""])[0] if isinstance(query.get("name"), list) else query.get("name", "")
            idx = int((query.get("index", ["0"])[0] if isinstance(query.get("index"), list) else query.get("index", "0")) or "0")
            return self._get_cam_setup_bodies(name, idx)
        elif path == "/cam/geometry-detail":
            return self._get_geometry_detail()
        elif path == "/cam/feature-candidates":
            return self._get_feature_candidates()
        elif path == "/cam/toolpath/status":
            job_id = query.get("job_id", [""])[0] if isinstance(query.get("job_id"), list) else query.get("job_id", "")
            return self._get_toolpath_status(job_id)
        elif path == "/cam/operations":
            name = query.get("name", [""])[0] if isinstance(query.get("name"), list) else query.get("name", "")
            return self._list_cam_operations(name)
        elif path == "/cam/toolpath/validity":
            name = query.get("name", [""])[0] if isinstance(query.get("name"), list) else query.get("name", "")
            return self._get_cam_toolpath_validity(name)
        elif path == "/cam/cycle-time":
            name = query.get("name", [""])[0] if isinstance(query.get("name"), list) else query.get("name", "")
            return self._get_cam_cycle_time(name)
        elif path == "/cam/materials":
            return self._get_cam_materials()
        elif path == "/data/projects":
            return self._list_data_projects()
        else:
            return {"error": f"Unknown endpoint: {path}"}

    def _dispatch_post(self, path, body):
        # Batch endpoint — runs multiple operations sequentially with doEvents between each
        if path == "/batch":
            return self._execute_batch(body)

        dispatch = {
            "/execute": self._execute_code,
            "/sketch": self._create_sketch,
            "/extrude": self._create_extrude,
            "/fillet": self._create_fillet,
            "/chamfer": self._create_chamfer,
            "/revolve": self._create_revolve,
            "/hole": self._create_hole,
            "/pattern": self._create_pattern,
            "/combine": self._create_combine,
            "/shell": self._create_shell,
            "/export": self._export_model,
            "/import": self._import_step,
            "/undo": lambda b: self._undo(),
            "/new": self._new_document,
            "/close": self._close_documents,
            "/parameter": self._handle_parameter,
            "/tool-import": self._import_tools,
            "/cam/setup": self._create_cam_setup,
            "/cam/operation": self._create_cam_operation,
            "/cam/assign-tool": self._assign_cam_tool,
            "/cam/toolpath": self._generate_cam_toolpath,
            "/cam/post": self._cam_post_process,
            "/data/folder/list": self._list_data_folder,
            "/data/search": self._search_data_files,
            "/data/file/open": self._open_data_file,
            "/data/file/metadata": self._get_data_file_metadata,
            "/data/file/versions": self._get_data_file_versions,
            # CAD-FULL-COVERAGE-MS0 / Wave L — single dispatcher for the 139-op
            # atomic-ops ontology. Body shape: {"op": "drawing.create-doc", "args": {...}}.
            "/atomic": self._dispatch_atomic,
        }
        handler = dispatch.get(path)
        if handler is None:
            return {"error": f"Unknown endpoint: {path}"}
        return handler(body)

    def _dispatch_delete(self, path):
        if path.startswith("/tool-library/"):
            lib_name = path[len("/tool-library/"):]
            if not lib_name:
                return {"error": "Missing library name in URL"}
            return self._delete_tool_library(lib_name)
        return {"error": f"Unknown endpoint: {path}"}

    # ── POST /batch ──────────────────────────────────────────────────

    def _execute_batch(self, body):
        """Execute multiple operations sequentially with doEvents between each.
        Body: {"operations": [{"method": "POST", "path": "/sketch", "body": {...}}, ...]}
        Returns: {"results": [...], "success_count": N, "error_count": N}"""
        operations = body.get("operations", [])
        if not operations:
            return {"error": "Missing 'operations' array"}

        # Security: block recursive /batch and /execute in batch
        BLOCKED_PATHS = {"/batch", "/execute"}
        MAX_BATCH_OPS = 50

        if len(operations) > MAX_BATCH_OPS:
            return {"error": f"Max {MAX_BATCH_OPS} operations per batch"}

        for op in operations:
            if op.get("path", "") in BLOCKED_PATHS:
                return {"error": f"'{op['path']}' is not allowed inside /batch"}

        results = []
        success_count = 0
        error_count = 0

        for i, op in enumerate(operations):
            method = op.get("method", "POST")
            path = op.get("path", "")
            op_body = op.get("body", {})
            op_query = op.get("query", {})

            try:
                result = self.dispatch(method, path, op_body, op_query)
                results.append({"index": i, "path": path, "result": result})
                if isinstance(result, dict) and result.get("error"):
                    error_count += 1
                else:
                    success_count += 1
            except Exception as e:
                results.append({"index": i, "path": path, "error": str(e)})
                error_count += 1

            # Let Fusion breathe between operations
            adsk.doEvents()

        return {
            "results": results,
            "success_count": success_count,
            "error_count": error_count,
            "total": len(operations),
        }

    # ── Design helper ────────────────────────────────────────────────

    def _get_design(self):
        """Get active Fusion 360 design, raising if none."""
        app = adsk.core.Application.get()
        doc = app.activeDocument
        if not doc:
            raise RuntimeError("No active document. Use POST /new first.")
        design = adsk.fusion.Design.cast(app.activeProduct)
        if not design:
            raise RuntimeError("Active product is not a Fusion design.")
        return design

    # ── GET /status ──────────────────────────────────────────────────

    def _get_status(self):
        app = adsk.core.Application.get()
        doc = app.activeDocument
        design = adsk.fusion.Design.cast(app.activeProduct) if doc else None
        result = {
            "status": "connected",
            "version": app.version,
            "document": doc.name if doc else None,
            "component_count": 0,
            "body_count": 0,
            "timeline_count": 0,
        }
        if design:
            root = design.rootComponent
            result["component_count"] = root.allOccurrences.count + 1
            result["body_count"] = root.bRepBodies.count
            result["timeline_count"] = design.timeline.count
        return result

    # ── GET /geometry ────────────────────────────────────────────────

    def _get_geometry(self):
        design = self._get_design()
        root = design.rootComponent
        bodies = []
        for i in range(root.bRepBodies.count):
            body = root.bRepBodies.item(i)
            bb = body.boundingBox
            min_pt = bb.minPoint
            max_pt = bb.maxPoint
            bodies.append({
                "name": body.name,
                "index": i,
                "volume_mm3": body.volume * 1000.0,       # cm^3 -> mm^3
                "area_mm2": body.area * 100.0,             # cm^2 -> mm^2
                "bounding_box_mm": [
                    (max_pt.x - min_pt.x) * 10.0,          # cm -> mm
                    (max_pt.y - min_pt.y) * 10.0,
                    (max_pt.z - min_pt.z) * 10.0,
                ],
                "bounding_box_min_mm": [min_pt.x * 10.0, min_pt.y * 10.0, min_pt.z * 10.0],
                "bounding_box_max_mm": [max_pt.x * 10.0, max_pt.y * 10.0, max_pt.z * 10.0],
                "face_count": body.faces.count,
                "edge_count": body.edges.count,
                "vertex_count": body.vertices.count,
                "is_valid": body.isValid,
            })
        return {"body_count": len(bodies), "bodies": bodies}

    # ── POST /execute ────────────────────────────────────────────────

    def _execute_code(self, body):
        code = body.get("code", "")
        if not code:
            return {"error": "Missing 'code' field"}

        # Security: block dangerous patterns via AST inspection
        import ast
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return {"success": False, "error": f"Syntax error: {e}"}

        BLOCKED_MODULES = {"subprocess", "shutil", "ctypes", "socket", "http",
                           "urllib", "ftplib", "smtplib", "telnetlib", "pickle",
                           "shelve", "tempfile", "signal", "multiprocessing"}
        BLOCKED_FUNCS = {"eval", "exec", "compile", "__import__", "globals",
                         "breakpoint", "exit", "quit"}
        BLOCKED_ATTRS = {"system", "popen", "spawn", "fork", "kill", "remove",
                         "rmdir", "rmtree", "unlink", "rename"}

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name.split(".")[0] in BLOCKED_MODULES:
                        return {"success": False, "error": f"Import '{alias.name}' is blocked for security"}
            elif isinstance(node, ast.ImportFrom):
                if node.module and node.module.split(".")[0] in BLOCKED_MODULES:
                    return {"success": False, "error": f"Import from '{node.module}' is blocked for security"}
            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name) and node.func.id in BLOCKED_FUNCS:
                    return {"success": False, "error": f"Function '{node.func.id}' is blocked for security"}
                if isinstance(node.func, ast.Attribute) and node.func.attr in BLOCKED_ATTRS:
                    return {"success": False, "error": f"Method '.{node.func.attr}()' is blocked for security"}
            elif isinstance(node, ast.Attribute) and node.attr == "sleep":
                return {"success": False, "error": "time.sleep() blocks Fusion's main thread. Use adsk.doEvents() instead."}

        # Restricted builtins — no open(), no __import__()
        BLOCKED_BUILTINS = {"open", "__import__", "eval", "exec", "compile",
                            "breakpoint", "exit", "quit", "globals", "locals"}
        raw_builtins = __builtins__ if isinstance(__builtins__, dict) else vars(__builtins__)
        safe_builtins = {k: v for k, v in raw_builtins.items() if k not in BLOCKED_BUILTINS}

        local_ns = {
            "__builtins__": safe_builtins,
            "adsk": adsk,
            "app": adsk.core.Application.get(),
            "math": math,
            "json": json,
        }
        try:
            exec(code, local_ns)
            adsk.doEvents()
            result_val = local_ns.get("result", None)
            return {"success": True, "result": result_val}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ── POST /sketch ─────────────────────────────────────────────────

    def _create_sketch(self, body):
        design = self._get_design()
        root = design.rootComponent

        plane_map = {
            "XY": root.xYConstructionPlane,
            "XZ": root.xZConstructionPlane,
            "YZ": root.yZConstructionPlane,
        }
        plane_key = body.get("plane", "XY").upper()
        plane = plane_map.get(plane_key, root.xYConstructionPlane)
        sketch = root.sketches.add(plane)

        shapes_created = 0
        for shape in body.get("shapes", []):
            shape_type = shape.get("type", "")
            if shape_type == "rectangle":
                w = shape.get("width_mm", 10) / 10.0   # mm -> cm
                h = shape.get("height_mm", 10) / 10.0
                cx = shape.get("center_x_mm", 0) / 10.0
                cy = shape.get("center_y_mm", 0) / 10.0
                sketch.sketchCurves.sketchLines.addTwoPointRectangle(
                    adsk.core.Point3D.create(cx - w / 2, cy - h / 2, 0),
                    adsk.core.Point3D.create(cx + w / 2, cy + h / 2, 0),
                )
                shapes_created += 1
            elif shape_type == "circle":
                r = shape.get("radius_mm", 5) / 10.0
                cx = shape.get("center_x_mm", 0) / 10.0
                cy = shape.get("center_y_mm", 0) / 10.0
                sketch.sketchCurves.sketchCircles.addByCenterRadius(
                    adsk.core.Point3D.create(cx, cy, 0), r
                )
                shapes_created += 1
            elif shape_type == "line":
                pts = shape.get("points", [])
                if len(pts) >= 2:
                    for j in range(len(pts) - 1):
                        p1 = adsk.core.Point3D.create(pts[j][0] / 10.0, pts[j][1] / 10.0, 0)
                        p2 = adsk.core.Point3D.create(pts[j + 1][0] / 10.0, pts[j + 1][1] / 10.0, 0)
                        sketch.sketchCurves.sketchLines.addByTwoPoints(p1, p2)
                    shapes_created += 1
            elif shape_type == "arc":
                cx = shape.get("center_x_mm", 0) / 10.0
                cy = shape.get("center_y_mm", 0) / 10.0
                r = shape.get("radius_mm", 5) / 10.0
                start_angle = math.radians(shape.get("start_angle_deg", 0))
                end_angle = math.radians(shape.get("end_angle_deg", 180))
                sketch.sketchCurves.sketchArcs.addByCenterStartSweep(
                    adsk.core.Point3D.create(cx, cy, 0),
                    adsk.core.Point3D.create(
                        cx + r * math.cos(start_angle),
                        cy + r * math.sin(start_angle),
                        0,
                    ),
                    end_angle - start_angle,
                )
                shapes_created += 1
            elif shape_type == "polygon":
                sides = shape.get("sides", 6)
                r = shape.get("radius_mm", 10) / 10.0
                cx = shape.get("center_x_mm", 0) / 10.0
                cy = shape.get("center_y_mm", 0) / 10.0
                points = []
                for k in range(sides):
                    angle = 2 * math.pi * k / sides
                    points.append(adsk.core.Point3D.create(
                        cx + r * math.cos(angle),
                        cy + r * math.sin(angle),
                        0,
                    ))
                for k in range(sides):
                    sketch.sketchCurves.sketchLines.addByTwoPoints(
                        points[k], points[(k + 1) % sides]
                    )
                shapes_created += 1

        return {
            "success": True,
            "sketch_name": sketch.name,
            "profile_count": sketch.profiles.count,
            "shapes_created": shapes_created,
        }

    # ── POST /extrude ────────────────────────────────────────────────

    def _create_extrude(self, body):
        design = self._get_design()
        root = design.rootComponent

        # Find profile
        profile_index = body.get("profile_index", 0)
        sketch_name = body.get("sketch_name")
        sketch = None
        if sketch_name:
            for i in range(root.sketches.count):
                s = root.sketches.item(i)
                if s.name == sketch_name:
                    sketch = s
                    break
        if sketch is None:
            sketch = root.sketches.item(root.sketches.count - 1)

        if sketch.profiles.count == 0:
            return {"success": False, "error": "No profiles in sketch"}
        if profile_index >= sketch.profiles.count:
            profile_index = 0
        profile = sketch.profiles.item(profile_index)

        depth_cm = body.get("depth_mm", 10) / 10.0
        operation = body.get("operation", "new").lower()

        op_map = {
            "new": adsk.fusion.FeatureOperations.NewBodyFeatureOperation,
            "join": adsk.fusion.FeatureOperations.JoinFeatureOperation,
            "cut": adsk.fusion.FeatureOperations.CutFeatureOperation,
            "intersect": adsk.fusion.FeatureOperations.IntersectFeatureOperation,
        }
        feat_op = op_map.get(operation, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)

        extrudes = root.features.extrudeFeatures
        distance = adsk.core.ValueInput.createByReal(depth_cm)
        ext_input = extrudes.createInput(profile, feat_op)

        symmetric = body.get("symmetric", False)
        if symmetric:
            ext_input.setSymmetricExtent(distance, True)
        else:
            direction = body.get("direction", "positive").lower()
            if direction == "negative":
                ext_input.setDistanceExtent(False, adsk.core.ValueInput.createByReal(-depth_cm))
            else:
                ext_input.setDistanceExtent(False, distance)

        feature = extrudes.add(ext_input)
        return {
            "success": True,
            "feature_name": feature.name,
            "body_count": root.bRepBodies.count,
        }

    # ── POST /fillet ─────────────────────────────────────────────────

    def _create_fillet(self, body):
        design = self._get_design()
        root = design.rootComponent
        radius_cm = body.get("radius_mm", 1) / 10.0
        edge_selection = body.get("edge_selection", "all")

        if root.bRepBodies.count == 0:
            return {"success": False, "error": "No bodies in design"}

        target_body = root.bRepBodies.item(body.get("body_index", 0))
        edges = self._select_edges(target_body, edge_selection)
        if not edges:
            return {"success": False, "error": "No edges matched selection"}

        fillets = root.features.filletFeatures
        fillet_input = fillets.createInput()
        edge_collection = adsk.core.ObjectCollection.create()
        for e in edges:
            edge_collection.add(e)
        fillet_input.addConstantRadiusEdgeSet(edge_collection, adsk.core.ValueInput.createByReal(radius_cm), True)
        feature = fillets.add(fillet_input)
        return {"success": True, "feature_name": feature.name, "edges_filleted": len(edges)}

    # ── POST /chamfer ────────────────────────────────────────────────

    def _create_chamfer(self, body):
        design = self._get_design()
        root = design.rootComponent
        distance_cm = body.get("distance_mm", 1) / 10.0
        edge_selection = body.get("edge_selection", "all")

        if root.bRepBodies.count == 0:
            return {"success": False, "error": "No bodies in design"}

        target_body = root.bRepBodies.item(body.get("body_index", 0))
        edges = self._select_edges(target_body, edge_selection)
        if not edges:
            return {"success": False, "error": "No edges matched selection"}

        chamfers = root.features.chamferFeatures
        edge_collection = adsk.core.ObjectCollection.create()
        for e in edges:
            edge_collection.add(e)
        chamfer_input = chamfers.createInput2()
        chamfer_input.chamferEdgeSets.addEqualDistanceChamferEdgeSet(
            edge_collection, adsk.core.ValueInput.createByReal(distance_cm), True
        )
        feature = chamfers.add(chamfer_input)
        return {"success": True, "feature_name": feature.name, "edges_chamfered": len(edges)}

    # ── POST /revolve ────────────────────────────────────────────────

    def _create_revolve(self, body):
        design = self._get_design()
        root = design.rootComponent

        profile_index = body.get("profile_index", 0)
        sketch_name = body.get("sketch_name")
        sketch = None
        if sketch_name:
            for i in range(root.sketches.count):
                s = root.sketches.item(i)
                if s.name == sketch_name:
                    sketch = s
                    break
        if sketch is None:
            sketch = root.sketches.item(root.sketches.count - 1)

        if sketch.profiles.count == 0:
            return {"success": False, "error": "No profiles in sketch"}
        profile = sketch.profiles.item(min(profile_index, sketch.profiles.count - 1))

        angle_deg = body.get("angle_deg", 360)
        axis_key = body.get("axis", "X").upper()
        axis_map = {
            "X": root.xConstructionAxis,
            "Y": root.yConstructionAxis,
            "Z": root.zConstructionAxis,
        }
        axis = axis_map.get(axis_key, root.xConstructionAxis)

        operation = body.get("operation", "new").lower()
        op_map = {
            "new": adsk.fusion.FeatureOperations.NewBodyFeatureOperation,
            "join": adsk.fusion.FeatureOperations.JoinFeatureOperation,
            "cut": adsk.fusion.FeatureOperations.CutFeatureOperation,
            "intersect": adsk.fusion.FeatureOperations.IntersectFeatureOperation,
        }
        feat_op = op_map.get(operation, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)

        revolves = root.features.revolveFeatures
        rev_input = revolves.createInput(profile, axis, feat_op)
        angle_val = adsk.core.ValueInput.createByString(f"{angle_deg} deg")
        rev_input.setAngleExtent(False, angle_val)

        feature = revolves.add(rev_input)
        return {"success": True, "feature_name": feature.name}

    # ── POST /hole ───────────────────────────────────────────────────

    def _create_hole(self, body):
        design = self._get_design()
        root = design.rootComponent

        diameter_cm = body.get("diameter_mm", 10) / 10.0
        depth_cm = body.get("depth_mm", 10) / 10.0
        position = body.get("position", [0, 0])
        hole_type = body.get("type", "simple").lower()
        face_index = body.get("face_index", 0)
        body_index = body.get("body_index", 0)

        if root.bRepBodies.count == 0:
            return {"success": False, "error": "No bodies in design"}

        target_body = root.bRepBodies.item(min(body_index, root.bRepBodies.count - 1))
        if face_index >= target_body.faces.count:
            face_index = 0
        target_face = target_body.faces.item(face_index)

        point = adsk.core.Point3D.create(position[0] / 10.0, position[1] / 10.0, 0)

        holes = root.features.holeFeatures
        hole_input = holes.createSimpleInput(adsk.core.ValueInput.createByReal(diameter_cm / 2.0))
        hole_input.setPositionByPoint(target_face, point)
        hole_input.setDistanceExtent(adsk.core.ValueInput.createByReal(depth_cm))

        if hole_type == "counterbore":
            cb_dia = body.get("counterbore_diameter_mm", diameter_cm * 10 * 1.8) / 10.0
            cb_depth = body.get("counterbore_depth_mm", depth_cm * 10 * 0.3) / 10.0
            hole_input.setCounterbore(
                adsk.core.ValueInput.createByReal(cb_dia),
                adsk.core.ValueInput.createByReal(cb_depth),
            )
        elif hole_type == "countersink":
            cs_dia = body.get("countersink_diameter_mm", diameter_cm * 10 * 2.0) / 10.0
            cs_angle = body.get("countersink_angle_deg", 82)
            hole_input.setCountersink(
                adsk.core.ValueInput.createByReal(cs_dia),
                adsk.core.ValueInput.createByString(f"{cs_angle} deg"),
            )

        feature = holes.add(hole_input)
        return {"success": True, "feature_name": feature.name}

    # ── POST /pattern ────────────────────────────────────────────────

    def _create_pattern(self, body):
        design = self._get_design()
        root = design.rootComponent

        pat_type = body.get("type", "linear").lower()
        count = body.get("count", 2)
        spacing_cm = body.get("spacing_mm", 10) / 10.0

        # Collect last feature's bodies/faces
        timeline = design.timeline
        if timeline.count == 0:
            return {"success": False, "error": "No features to pattern"}

        entities = adsk.core.ObjectCollection.create()
        last_body = root.bRepBodies.item(root.bRepBodies.count - 1)
        entities.add(last_body)

        if pat_type == "linear":
            axis_key = body.get("axis", "X").upper()
            axis_map = {"X": root.xConstructionAxis, "Y": root.yConstructionAxis, "Z": root.zConstructionAxis}
            axis = axis_map.get(axis_key, root.xConstructionAxis)

            patterns = root.features.rectangularPatternFeatures
            pat_input = patterns.createInput(
                entities,
                axis,
                adsk.core.ValueInput.createByReal(count),
                adsk.core.ValueInput.createByReal(spacing_cm),
                adsk.fusion.PatternDistanceType.SpacingPatternDistanceType,
            )

            # Optional second direction
            count2 = body.get("count2", 1)
            if count2 > 1:
                axis2_key = body.get("axis2", "Y").upper()
                axis2 = axis_map.get(axis2_key, root.yConstructionAxis)
                spacing2_cm = body.get("spacing2_mm", spacing_cm * 10) / 10.0
                pat_input.setDirectionTwo(
                    axis2,
                    adsk.core.ValueInput.createByReal(count2),
                    adsk.core.ValueInput.createByReal(spacing2_cm),
                )

            feature = patterns.add(pat_input)
            return {"success": True, "feature_name": feature.name, "instance_count": count}

        elif pat_type == "circular":
            axis_key = body.get("axis", "Z").upper()
            axis_map = {"X": root.xConstructionAxis, "Y": root.yConstructionAxis, "Z": root.zConstructionAxis}
            axis = axis_map.get(axis_key, root.zConstructionAxis)

            patterns = root.features.circularPatternFeatures
            pat_input = patterns.createInput(entities, axis)
            pat_input.quantity = adsk.core.ValueInput.createByReal(count)
            total_angle = body.get("total_angle_deg", 360)
            pat_input.totalAngle = adsk.core.ValueInput.createByString(f"{total_angle} deg")
            pat_input.isSymmetric = body.get("symmetric", False)

            feature = patterns.add(pat_input)
            return {"success": True, "feature_name": feature.name, "instance_count": count}

        return {"success": False, "error": f"Unknown pattern type: {pat_type}"}

    # ── POST /combine ────────────────────────────────────────────────

    def _create_combine(self, body):
        design = self._get_design()
        root = design.rootComponent

        operation = body.get("operation", "join").lower()
        target_idx = body.get("target_body", 0)
        tool_indices = body.get("tool_bodies", [1])

        if root.bRepBodies.count < 2:
            return {"success": False, "error": "Need at least 2 bodies for combine"}

        target_body = root.bRepBodies.item(target_idx)
        tool_bodies = adsk.core.ObjectCollection.create()
        for idx in tool_indices:
            if idx < root.bRepBodies.count:
                tool_bodies.add(root.bRepBodies.item(idx))

        op_map = {
            "join": adsk.fusion.FeatureOperations.JoinFeatureOperation,
            "cut": adsk.fusion.FeatureOperations.CutFeatureOperation,
            "intersect": adsk.fusion.FeatureOperations.IntersectFeatureOperation,
        }
        feat_op = op_map.get(operation, adsk.fusion.FeatureOperations.JoinFeatureOperation)

        combines = root.features.combineFeatures
        combine_input = combines.createInput(target_body, tool_bodies)
        combine_input.operation = feat_op
        feature = combines.add(combine_input)
        return {"success": True, "feature_name": feature.name}

    # ── POST /shell ──────────────────────────────────────────────────

    def _create_shell(self, body):
        design = self._get_design()
        root = design.rootComponent
        thickness_cm = body.get("thickness_mm", 1) / 10.0
        face_selection = body.get("face_selection", "top")

        if root.bRepBodies.count == 0:
            return {"success": False, "error": "No bodies in design"}

        target_body = root.bRepBodies.item(body.get("body_index", 0))
        faces_to_remove = adsk.core.ObjectCollection.create()

        if isinstance(face_selection, list):
            for idx in face_selection:
                if idx < target_body.faces.count:
                    faces_to_remove.add(target_body.faces.item(idx))
        elif face_selection == "top":
            best_face = None
            best_z = -1e30
            for i in range(target_body.faces.count):
                face = target_body.faces.item(i)
                bb = face.boundingBox
                if bb.maxPoint.z > best_z:
                    best_z = bb.maxPoint.z
                    best_face = face
            if best_face:
                faces_to_remove.add(best_face)
        elif face_selection == "bottom":
            best_face = None
            best_z = 1e30
            for i in range(target_body.faces.count):
                face = target_body.faces.item(i)
                bb = face.boundingBox
                if bb.minPoint.z < best_z:
                    best_z = bb.minPoint.z
                    best_face = face
            if best_face:
                faces_to_remove.add(best_face)

        shells = root.features.shellFeatures
        shell_input = shells.createInput(faces_to_remove)
        shell_input.insideThickness = adsk.core.ValueInput.createByReal(thickness_cm)
        feature = shells.add(shell_input)
        return {"success": True, "feature_name": feature.name}

    # ── POST /export ─────────────────────────────────────────────────

    def _export_model(self, body):
        design = self._get_design()

        fmt = body.get("format", "step").lower()
        export_path = body.get("path", "")
        if not export_path:
            return {"success": False, "error": "Missing 'path' field"}

        # Security: block path traversal and UNC paths. Block a literal ".." path SEGMENT (real traversal),
        # NOT any ".." substring -- a filename like "001..STEP" or "TRILOBE ..STEP" is legitimate (the
        # substring check false-rejected valid corpus parts). Raw split (not normpath, which resolves a
        # drive-absolute "..") so every ".." segment in the INPUT is still blocked, matching prior strictness.
        if ".." in export_path.replace("\\", "/").split("/") or export_path.startswith("\\\\"):
            return {"success": False, "error": "Path traversal not allowed"}

        export_mgr = design.exportManager

        if fmt in ("step", "stp"):
            options = export_mgr.createSTEPExportOptions(export_path)
            export_mgr.execute(options)
        elif fmt == "stl":
            options = export_mgr.createSTLExportOptions(design.rootComponent)
            options.filename = export_path
            mesh_refinement = body.get("refinement", "medium").lower()
            if mesh_refinement == "high":
                options.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementHigh
            elif mesh_refinement == "low":
                options.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementLow
            else:
                options.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementMedium
            export_mgr.execute(options)
        elif fmt == "f3d":
            options = export_mgr.createFusionArchiveExportOptions(export_path)
            export_mgr.execute(options)
        elif fmt == "iges":
            options = export_mgr.createIGESExportOptions(export_path)
            export_mgr.execute(options)
        else:
            return {"success": False, "error": f"Unsupported format: {fmt}"}

        return {"success": True, "format": fmt, "path": export_path}

    # ── POST /import ─────────────────────────────────────────────────

    def _import_step(self, body):
        # Import a real CAD file (STEP/IGES/F3D/SMT) into the active design so GET /geometry reports
        # Fusion's KERNEL bounding box -- the authoritative part envelope, with the file's own units
        # resolved natively by Fusion (no manual inch/mm 25.4x scaling). Resolves the ~9.5% of corpus STEP
        # parts (curved/hollow) whose point-cloud (CARTESIAN_POINT) bbox is degenerate in the text
        # extractor (U-DELTA-FUSION-STEP-IMPORT-KERNELBBOX). Mirrors _export_model's shape exactly.
        # NOTE: an assembly STEP imports as occurrences (sub-component bodies); the root-only /geometry
        # counts root bRepBodies, so a multi-component import reports body_count from the root only.
        design = self._get_design()

        import_path = body.get("path", "")
        if not import_path:
            return {"success": False, "error": "Missing 'path' field"}

        # Security: block path traversal and UNC paths (mirror _export_model). Literal ".." path SEGMENT
        # only (raw split, not normpath), NOT any ".." substring -- "E7108244-001..STEP" / "TRILOBE ..STEP"
        # are legitimate filenames; every real ".." traversal segment in the input is still blocked.
        if ".." in import_path.replace("\\", "/").split("/") or import_path.startswith("\\\\"):
            return {"success": False, "error": "Path traversal not allowed"}

        fmt = str(body.get("format") or import_path.rsplit(".", 1)[-1]).lower()
        app = adsk.core.Application.get()
        import_mgr = app.importManager

        if fmt in ("step", "stp"):
            options = import_mgr.createSTEPImportOptions(import_path)
        elif fmt in ("iges", "igs"):
            options = import_mgr.createIGESImportOptions(import_path)
        elif fmt == "smt":
            options = import_mgr.createSMTImportOptions(import_path)
        elif fmt == "f3d":
            options = import_mgr.createFusionArchiveImportOptions(import_path)
        else:
            return {"success": False, "error": f"Unsupported format: {fmt}"}

        root = design.rootComponent
        before = root.bRepBodies.count
        import_mgr.importToTarget(options, root)
        # A STEP/IGES import lands its solid in a NEW occurrence (sub-component), NOT root.bRepBodies --
        # so traverse root + all occurrences to find the imported body and report its KERNEL bounding box
        # (the authoritative envelope, units already resolved by Fusion). cm->mm via *10, like /geometry.
        bodies = [root.bRepBodies.item(i) for i in range(root.bRepBodies.count)]
        for i in range(root.allOccurrences.count):
            comp = root.allOccurrences.item(i).component
            for j in range(comp.bRepBodies.count):
                bodies.append(comp.bRepBodies.item(j))
        bounding_box_mm = None
        volume_mm3 = None
        if bodies:
            b = bodies[-1]  # most-recently-added body = the just-imported solid
            bb = b.boundingBox
            bounding_box_mm = [
                (bb.maxPoint.x - bb.minPoint.x) * 10.0,
                (bb.maxPoint.y - bb.minPoint.y) * 10.0,
                (bb.maxPoint.z - bb.minPoint.z) * 10.0,
            ]
            volume_mm3 = b.physicalProperties.volume * 1000.0
        return {"success": True, "format": fmt, "path": import_path,
                "bodies_imported": root.bRepBodies.count - before,
                "body_count": len(bodies),
                "bounding_box_mm": bounding_box_mm, "volume_mm3": volume_mm3}

    # ── POST /undo ───────────────────────────────────────────────────

    def _undo(self):
        app = adsk.core.Application.get()
        doc = app.activeDocument
        if not doc:
            return {"success": False, "error": "No active document"}
        # Fusion 360 API has no doc.undo() — use the text command interface
        app.executeTextCommand("Commands.Undo")
        return {"success": True}

    # ── POST /new ────────────────────────────────────────────────────

    def _new_document(self, body):
        app = adsk.core.Application.get()
        doc = app.documents.add(adsk.core.DocumentTypes.FusionDesignDocumentType)
        design = adsk.fusion.Design.cast(app.activeProduct)
        if body.get("parametric", True):
            design.designType = adsk.fusion.DesignTypes.ParametricDesignType

        # Set document name if provided
        doc_name = body.get("name", "")
        if doc_name:
            doc.name = doc_name

        return {
            "success": True,
            "document_name": doc.name,
            "design_type": "parametric" if design.designType == adsk.fusion.DesignTypes.ParametricDesignType else "direct",
        }

    # ── GET /documents ───────────────────────────────────────────────
    def _list_documents(self):
        """Enumerate every open document with the fields needed for safe close decisions.
        DOC-LIFECYCLE-MS0 (slot:delta) — closed-loop testing must reap its own docs without leaking windows."""
        app = adsk.core.Application.get()
        docs = app.documents
        active_name = app.activeDocument.name if app.activeDocument else None
        out = []
        for i in range(docs.count):
            d = docs.item(i)
            out.append({
                "name": d.name,
                "isActive": (d == app.activeDocument),
                "isModified": d.isModified,
                "isSaved": d.isSaved,
            })
        return {"success": True, "count": docs.count, "activeName": active_name, "documents": out}

    # ── POST /close ──────────────────────────────────────────────────
    def _close_documents(self, body):
        """Close documents WITHOUT saving. SAFETY: never closes the active document, and (unless force=True)
        never closes a modified document. Two modes:
          {"prefix": "PRISM-DELTA-LOOP-", "force": true}  → bulk-close every doc whose name starts with prefix
                                                            (high→low index; re-activates a non-prefixed doc if
                                                            the active one matches), or
          {"names": ["a","b"], "force": false}            → close the named docs.
        `force` bypasses the modified-guard for caller-OWNED disposable docs; the active-guard is NEVER bypassed.
        Refuses an empty prefix (would close everything). saveChanges is ALWAYS False — never persists."""
        app = adsk.core.Application.get()
        docs = app.documents
        force = bool(body.get("force", False))
        prefix = body.get("prefix")
        names = body.get("names")
        closed = []
        refused = []
        reactivated = None

        if prefix is not None:
            if not isinstance(prefix, str) or prefix == "":
                return {"success": False, "error": "empty prefix refused (would close all documents)"}
            # if the active doc matches the prefix, activate the first NON-matching doc so it can be closed
            if app.activeDocument and app.activeDocument.name.startswith(prefix):
                for i in range(docs.count):
                    d = docs.item(i)
                    if not d.name.startswith(prefix):
                        d.activate(); reactivated = d.name; break
                adsk.doEvents()
            # close high→low so indices of not-yet-visited docs stay valid
            for i in range(docs.count - 1, -1, -1):
                d = docs.item(i)
                if d.name.startswith(prefix) and d != app.activeDocument:
                    if d.isModified and not force:
                        refused.append({"name": d.name, "reason": "modified"}); continue
                    nm = d.name
                    try:
                        d.close(False); closed.append(nm)
                    except Exception as e:
                        refused.append({"name": nm, "reason": str(e)})
            return {"success": True, "closed": closed, "refused": refused, "reactivated": reactivated,
                    "remaining": app.documents.count, "activeName": app.activeDocument.name if app.activeDocument else None}

        if isinstance(names, list):
            target = set(names)
            for i in range(docs.count - 1, -1, -1):
                d = docs.item(i)
                if d.name in target:
                    if d == app.activeDocument:
                        refused.append({"name": d.name, "reason": "active"}); continue
                    if d.isModified and not force:
                        refused.append({"name": d.name, "reason": "modified"}); continue
                    nm = d.name
                    try:
                        d.close(False); closed.append(nm)
                    except Exception as e:
                        refused.append({"name": nm, "reason": str(e)})
            return {"success": True, "closed": closed, "refused": refused,
                    "remaining": app.documents.count, "activeName": app.activeDocument.name if app.activeDocument else None}

        return {"success": False, "error": "provide either 'prefix' or 'names'"}

    # ── POST /parameter ─────────────────────────────────────────────

    def _handle_parameter(self, body):
        design = self._get_design()
        action = body.get("action", "get").lower()
        params = design.userParameters

        if action == "list":
            result = []
            for i in range(params.count):
                p = params.item(i)
                result.append({
                    "name": p.name,
                    "value": p.value * 10.0,   # cm -> mm
                    "expression": p.expression,
                    "unit": p.unit,
                    "comment": p.comment,
                })
            return {"success": True, "parameters": result}

        name = body.get("name")
        if not name:
            return {"success": False, "error": "Missing 'name' field"}

        if action == "set":
            value_mm = body.get("value_mm")
            expression = body.get("expression")
            if expression:
                val_input = adsk.core.ValueInput.createByString(expression)
            elif value_mm is not None:
                val_input = adsk.core.ValueInput.createByReal(value_mm / 10.0)
            else:
                return {"success": False, "error": "Missing 'value_mm' or 'expression'"}

            existing = params.itemByName(name)
            if existing:
                existing.expression = expression if expression else f"{value_mm} mm"
                return {"success": True, "action": "updated", "name": name}
            else:
                params.add(name, val_input, "", body.get("comment", ""))
                return {"success": True, "action": "created", "name": name}

        elif action == "get":
            p = params.itemByName(name)
            if not p:
                return {"success": False, "error": f"Parameter '{name}' not found"}
            return {
                "success": True,
                "name": p.name,
                "value_mm": p.value * 10.0,
                "expression": p.expression,
                "unit": p.unit,
            }

        return {"success": False, "error": f"Unknown action: {action}"}

    # ── Tool library directory helper ─────────────────────────────────

    def _get_tool_library_dir(self):
        """Return the standard Fusion 360 local tool library directory."""
        appdata = os.environ.get("APPDATA", "")
        lib_dir = os.path.join(appdata, "Autodesk", "Autodesk Fusion 360",
                               "CAM", "Libraries", "Local")
        os.makedirs(lib_dir, exist_ok=True)
        return lib_dir

    # ── POST /tool-import ─────────────────────────────────────────────

    def _import_tools(self, body):
        tools = body.get("tools", [])
        library_name = os.path.basename(body.get("library_name", "PRISM"))
        if ".." in library_name or "/" in library_name or "\\" in library_name:
            return {"error": "Invalid library name", "success": False}
        if not tools:
            return {"error": "Missing or empty 'tools' array", "success": False}
        if len(tools) > 1000:
            return {"error": "Max 1000 tools per import request", "success": False}

        # Try adsk.cam API first
        try:
            app = adsk.core.Application.get()
            cam_product = adsk.cam.CAM.cast(app.activeProduct)
            if cam_product is None:
                raise RuntimeError("CAM workspace not active")

            tool_libs = cam_product.toolLibraries
            lib_url = None
            local_libs = tool_libs.toolLibraryUrls
            for i in range(local_libs.count):
                url = local_libs.item(i)
                if url.toString().endswith(library_name) or url.leafName == library_name:
                    lib_url = url
                    break

            if lib_url is None:
                local_folder = tool_libs.urlByLocation(adsk.cam.LibraryLocations.LocalLibraryLocation)
                lib_url = local_folder.clone()
                lib_url.appendPath(library_name)

            imported = 0
            for tool_data in tools:
                try:
                    tool_lib = tool_libs.toolLibraryAtUrl(lib_url)
                    new_tool = adsk.cam.Tool.createFromJson(json.dumps(tool_data))
                    tool_lib.add(new_tool)
                    imported += 1
                except Exception:
                    continue

            return {
                "success": True,
                "imported": imported,
                "total": len(tools),
                "library": library_name,
                "method": "cam_api",
            }

        except Exception:
            # Fallback: write .tools JSON file to the standard library directory
            lib_dir = self._get_tool_library_dir()
            file_path = os.path.join(lib_dir, f"{library_name}.tools")

            existing_tools = []
            if os.path.isfile(file_path):
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        existing_data = json.load(f)
                    existing_tools = existing_data.get("data", [])
                except Exception:
                    existing_tools = []

            existing_descs = set()
            for t in existing_tools:
                desc = t.get("description", t.get("product-id", ""))
                if desc:
                    existing_descs.add(desc)

            imported = 0
            for tool_data in tools:
                desc = tool_data.get("description", tool_data.get("product-id", ""))
                if desc and desc in existing_descs:
                    for i, t in enumerate(existing_tools):
                        if t.get("description", t.get("product-id", "")) == desc:
                            existing_tools[i] = tool_data
                            break
                else:
                    existing_tools.append(tool_data)
                imported += 1

            library_data = {
                "version": 2,
                "data": existing_tools,
            }
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(library_data, f, indent=2)

            return {
                "success": True,
                "imported": imported,
                "total": len(tools),
                "library": library_name,
                "path": file_path,
                "method": "file_fallback",
            }

    # ── GET /tool-library ─────────────────────────────────────────────

    def _list_tool_libraries(self):
        libraries = []

        try:
            app = adsk.core.Application.get()
            cam_product = adsk.cam.CAM.cast(app.activeProduct)
            if cam_product is None:
                raise RuntimeError("CAM workspace not active")

            tool_libs = cam_product.toolLibraries
            lib_urls = tool_libs.toolLibraryUrls
            for i in range(lib_urls.count):
                url = lib_urls.item(i)
                try:
                    lib = tool_libs.toolLibraryAtUrl(url)
                    tool_count = lib.count if lib else 0
                except Exception:
                    tool_count = 0
                libraries.append({
                    "name": url.leafName if hasattr(url, "leafName") else url.toString().split("/")[-1],
                    "tool_count": tool_count,
                    "path": url.toString(),
                    "source": "cam_api",
                })

            return {"libraries": libraries, "method": "cam_api"}

        except Exception:
            lib_dir = self._get_tool_library_dir()
            tools_files = globmod.glob(os.path.join(lib_dir, "*.tools"))

            for file_path in sorted(tools_files):
                name = os.path.splitext(os.path.basename(file_path))[0]
                tool_count = 0
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    tool_count = len(data.get("data", []))
                except Exception:
                    pass
                libraries.append({
                    "name": name,
                    "tool_count": tool_count,
                    "path": file_path,
                    "source": "file_fallback",
                })

            return {"libraries": libraries, "method": "file_fallback"}

    # ── GET /tool-library/search ──────────────────────────────────────

    def _search_tool_libraries(self, query, tool_type):
        if not query and not tool_type:
            return {"error": "Provide at least 'q' or 'type' query parameter", "matches": []}

        query_lower = query.lower() if query else ""
        type_lower = tool_type.lower() if tool_type else ""
        matches = []

        try:
            app = adsk.core.Application.get()
            cam_product = adsk.cam.CAM.cast(app.activeProduct)
            if cam_product is None:
                raise RuntimeError("CAM workspace not active")

            tool_libs = cam_product.toolLibraries
            lib_urls = tool_libs.toolLibraryUrls
            for i in range(lib_urls.count):
                url = lib_urls.item(i)
                try:
                    lib = tool_libs.toolLibraryAtUrl(url)
                    if not lib:
                        continue
                    lib_name = url.leafName if hasattr(url, "leafName") else url.toString().split("/")[-1]
                    for j in range(lib.count):
                        tool = lib.item(j)
                        try:
                            tool_json = json.loads(tool.toJson())
                        except Exception:
                            tool_json = {}
                        tool_desc = tool_json.get("description", "").lower()
                        tool_pid = tool_json.get("product-id", "").lower()
                        tool_tp = tool_json.get("type", "").lower()

                        if query_lower and query_lower not in tool_desc and query_lower not in tool_pid:
                            continue
                        if type_lower and type_lower != tool_tp:
                            continue

                        matches.append({
                            "library": lib_name,
                            "tool": tool_json,
                            "source": "cam_api",
                        })
                except Exception:
                    continue

            return {"matches": matches, "count": len(matches), "method": "cam_api"}

        except Exception:
            lib_dir = self._get_tool_library_dir()
            tools_files = globmod.glob(os.path.join(lib_dir, "*.tools"))

            for file_path in tools_files:
                lib_name = os.path.splitext(os.path.basename(file_path))[0]
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                except Exception:
                    continue

                for tool_data in data.get("data", []):
                    tool_desc = str(tool_data.get("description", "")).lower()
                    tool_pid = str(tool_data.get("product-id", "")).lower()
                    tool_tp = str(tool_data.get("type", "")).lower()

                    if query_lower and query_lower not in tool_desc and query_lower not in tool_pid:
                        continue
                    if type_lower and type_lower != tool_tp:
                        continue

                    matches.append({
                        "library": lib_name,
                        "tool": tool_data,
                        "source": "file_fallback",
                    })

            return {"matches": matches, "count": len(matches), "method": "file_fallback"}

    # ── DELETE /tool-library/<name> ───────────────────────────────────

    def _delete_tool_library(self, name):
        # Security: sanitize library name
        name = os.path.basename(name)
        if ".." in name or "/" in name or "\\" in name or not name:
            return {"success": False, "error": "Invalid library name"}
        try:
            app = adsk.core.Application.get()
            cam_product = adsk.cam.CAM.cast(app.activeProduct)
            if cam_product is None:
                raise RuntimeError("CAM workspace not active")

            tool_libs = cam_product.toolLibraries
            lib_urls = tool_libs.toolLibraryUrls
            for i in range(lib_urls.count):
                url = lib_urls.item(i)
                leaf = url.leafName if hasattr(url, "leafName") else url.toString().split("/")[-1]
                if leaf == name:
                    tool_libs.removeToolLibrary(url)
                    return {
                        "success": True,
                        "deleted": name,
                        "method": "cam_api",
                    }

            raise RuntimeError("Library not found via CAM API, trying file fallback")

        except Exception:
            lib_dir = self._get_tool_library_dir()
            file_path = os.path.join(lib_dir, f"{name}.tools")
            if os.path.isfile(file_path):
                os.remove(file_path)
                return {
                    "success": True,
                    "deleted": name,
                    "path": file_path,
                    "method": "file_fallback",
                }
            return {
                "success": False,
                "error": f"Tool library '{name}' not found",
            }

    # ── CAM Creation endpoints (P0-U01 through P0-U04) ────────────

    def _create_cam_setup(self, body):
        """POST /cam/setup — Create a new CAM setup with stock, WCS, model bodies."""
        app = adsk.core.Application.get()
        doc = app.activeDocument
        if not doc:
            return {"error": "No active document. Open a model first."}

        # Get or switch to CAM product
        cam = adsk.cam.CAM.cast(app.activeProduct)
        if not cam:
            # Try to get CAM from document products
            for i in range(doc.products.count):
                prod = doc.products.item(i)
                if prod.productType == "CAMProductType":
                    cam = adsk.cam.CAM.cast(prod)
                    break
        if not cam:
            return {"error": "No CAM product. Switch to MANUFACTURE workspace."}

        setup_type = body.get("type", "milling").lower()
        type_map = {
            "milling": adsk.cam.OperationTypes.MillingOperation,
            "turning": adsk.cam.OperationTypes.TurningOperation,
        }
        op_type = type_map.get(setup_type, adsk.cam.OperationTypes.MillingOperation)

        try:
            setup_input = cam.setups.createInput(op_type)

            # Assign model bodies
            design = adsk.fusion.Design.cast(doc.products.itemByProductType("DesignProductType"))
            if design:
                root = design.rootComponent
                body_indices = body.get("model_body_indices", [0])
                models = adsk.core.ObjectCollection.create()
                for idx in body_indices:
                    if 0 <= idx < root.bRepBodies.count:
                        models.add(root.bRepBodies.item(idx))
                if models.count > 0:
                    setup_input.models = models

            new_setup = cam.setups.add(setup_input)

            # Set name
            name = body.get("name")
            if name:
                new_setup.name = name

            # Set stock parameters
            stock = body.get("stock", {})
            try:
                params = new_setup.parameters
                stock_mode = stock.get("mode", "relative")
                if stock_mode == "fixed_size":
                    mode_param = params.itemByName("job_stockMode")
                    if mode_param:
                        mode_param.expression = "'fixedBox'"
                    for dim_key, param_name in [
                        ("width_mm", "job_stockFixedX"),
                        ("height_mm", "job_stockFixedY"),
                        ("depth_mm", "job_stockFixedZ"),
                    ]:
                        val = stock.get(dim_key)
                        if val is not None:
                            p = params.itemByName(param_name)
                            if p:
                                p.expression = f"{val / 10.0} cm"  # mm → cm
                elif stock_mode == "relative":
                    for offset_key, param_name in [
                        ("offset_top_mm", "job_stockOffsetTop"),
                        ("offset_bottom_mm", "job_stockOffsetBottom"),
                        ("offset_sides_mm", "job_stockOffsetSide"),
                    ]:
                        val = stock.get(offset_key)
                        if val is not None:
                            p = params.itemByName(param_name)
                            if p:
                                p.expression = f"{val / 10.0} cm"
            except Exception:
                pass  # Stock params are optional

            adsk.doEvents()

            return {
                "success": True,
                "setup_name": new_setup.name,
                "setup_index": cam.setups.count - 1,
                "model_count": models.count if design else 0,
                "stock_mode": stock.get("mode", "relative"),
            }
        except Exception as e:
            return {"error": str(e), "traceback": traceback.format_exc()}

    def _create_cam_operation(self, body):
        """POST /cam/operation — Create a CAM operation with type mapping + parameters."""
        app = adsk.core.Application.get()
        cam = adsk.cam.CAM.cast(app.activeProduct)
        if not cam:
            return {"error": "No CAM product. Switch to MANUFACTURE workspace."}

        # Find target setup
        setup_name = body.get("setup_name", "")
        setup_index = body.get("setup_index", 0)
        setup = self._find_setup(cam, setup_name, setup_index)
        if not setup:
            return {"error": f"Setup not found: name='{setup_name}' index={setup_index}"}

        # Map operation type
        op_type = body.get("operation_type", "adaptive_clear")
        fusion_cmd = OPERATION_TYPE_MAP.get(op_type)
        if not fusion_cmd:
            valid = ", ".join(sorted(OPERATION_TYPE_MAP.keys()))
            return {"error": f"Unknown operation_type: '{op_type}'. Valid: {valid}"}

        try:
            # Create the operation
            op_input = setup.createOperationInput(fusion_cmd)
            new_op = setup.operations.add(op_input)

            # Set parameters
            params = body.get("parameters", {})
            params_set = 0
            warnings = []
            for prism_key, (fusion_key, factor) in CAM_PARAM_MAP.items():
                val = params.get(prism_key)
                if val is not None:
                    try:
                        p = new_op.parameters.itemByName(fusion_key)
                        if p:
                            p.expression = str(val * factor)
                            params_set += 1
                        else:
                            warnings.append(f"Parameter '{fusion_key}' not found for operation type '{fusion_cmd}'")
                    except Exception as pe:
                        warnings.append(f"Failed to set '{fusion_key}': {str(pe)}")

            adsk.doEvents()

            return {
                "success": True,
                "operation_name": new_op.name,
                "operation_type": op_type,
                "fusion_command": fusion_cmd,
                "setup_name": setup.name,
                "parameters_set": params_set,
                "warnings": warnings,
            }
        except Exception as e:
            return {"error": str(e), "traceback": traceback.format_exc()}

    def _assign_cam_tool(self, body):
        """POST /cam/assign-tool — Assign a tool to an operation from library or inline."""
        app = adsk.core.Application.get()
        cam = adsk.cam.CAM.cast(app.activeProduct)
        if not cam:
            return {"error": "No CAM product."}

        setup_name = body.get("setup_name", "")
        op_name = body.get("operation_name", "")
        tool_spec = body.get("tool_spec", {})

        # Find the operation
        setup = self._find_setup(cam, setup_name, body.get("setup_index", 0))
        if not setup:
            return {"error": f"Setup not found: '{setup_name}'"}

        operation = None
        for i in range(setup.operations.count):
            op = setup.operations.item(i)
            if op.name == op_name:
                operation = op
                break
        if not operation and setup.operations.count > 0:
            operation = setup.operations.item(setup.operations.count - 1)
        if not operation:
            return {"error": f"Operation not found: '{op_name}'"}

        try:
            # Try to create tool from spec
            tool_type = tool_spec.get("type", "flat end mill")
            diameter = tool_spec.get("diameter_mm", 10)
            flutes = tool_spec.get("flute_count", 3)
            flute_len = tool_spec.get("flute_length_mm", diameter * 3)
            oal = tool_spec.get("overall_length_mm", diameter * 6)
            corner_r = tool_spec.get("corner_radius_mm", 0)

            tool_json = {
                "type": tool_type,
                "unit": "millimeters",
                "geometry": {
                    "DC": diameter,
                    "LCF": flute_len,
                    "OAL": oal,
                    "NOF": flutes,
                    "RE": corner_r,
                },
                "description": tool_spec.get("description", f"D{diameter} {flutes}FL {tool_type}"),
            }

            new_tool = adsk.cam.Tool.createFromJson(json.dumps(tool_json))
            operation.tool = new_tool

            adsk.doEvents()

            return {
                "success": True,
                "operation_name": operation.name,
                "tool_description": tool_json["description"],
                "diameter_mm": diameter,
                "flute_count": flutes,
                "method": "inline_creation",
            }
        except Exception as e:
            return {"error": str(e), "traceback": traceback.format_exc()}

    def _generate_cam_toolpath(self, body):
        """POST /cam/toolpath — Start async toolpath generation, return job_id for polling."""
        global _cam_jobs
        app = adsk.core.Application.get()
        cam = adsk.cam.CAM.cast(app.activeProduct)
        if not cam:
            return {"error": "No CAM product."}

        setup_name = body.get("setup_name", "")
        generate_all = body.get("generate_all", True)

        setup = self._find_setup(cam, setup_name, body.get("setup_index", 0))
        if not setup:
            return {"error": f"Setup not found: '{setup_name}'"}

        try:
            if generate_all:
                future = cam.generateAllToolpaths(False)
            else:
                op_names = body.get("operation_names", [])
                ops = adsk.core.ObjectCollection.create()
                for i in range(setup.operations.count):
                    op = setup.operations.item(i)
                    if not op_names or op.name in op_names:
                        ops.add(op)
                if ops.count == 0:
                    return {"error": "No operations to generate toolpaths for"}
                future = cam.generateToolpath(ops)

            job_id = f"tp-{int(time.time() * 1000)}"
            _cam_jobs[job_id] = {
                "future": future,
                "start": time.time(),
                "setup": setup.name,
                "status": "generating",
            }

            # Clean old jobs (>5 min)
            stale = [k for k, v in _cam_jobs.items() if time.time() - v["start"] > 300]
            for k in stale:
                del _cam_jobs[k]

            return {
                "success": True,
                "job_id": job_id,
                "status": "generating",
                "setup_name": setup.name,
            }
        except Exception as e:
            return {"error": str(e), "traceback": traceback.format_exc()}

    def _get_toolpath_status(self, job_id):
        """GET /cam/toolpath/status — Poll async toolpath generation status."""
        if not job_id or job_id not in _cam_jobs:
            return {"error": f"Unknown job: '{job_id}'", "valid_jobs": list(_cam_jobs.keys())}

        job = _cam_jobs[job_id]
        elapsed = time.time() - job["start"]

        try:
            if job["future"].isGenerationCompleted:
                job["status"] = "complete"
            elif elapsed > 180:
                job["status"] = "timeout"
        except Exception:
            job["status"] = "error"

        return {
            "job_id": job_id,
            "status": job["status"],
            "elapsed_sec": round(elapsed, 1),
            "setup_name": job.get("setup", ""),
        }

    def _cam_post_process(self, body):
        """POST /cam/post — Post-process CAM operations to G-code."""
        app = adsk.core.Application.get()
        cam = adsk.cam.CAM.cast(app.activeProduct)
        if not cam:
            return {"error": "No CAM product."}

        setup_name = body.get("setup_name", "")
        setup = self._find_setup(cam, setup_name, body.get("setup_index", 0))
        if not setup:
            return {"error": f"Setup not found: '{setup_name}'"}

        cps_path = body.get("post_processor_path", "")
        if not cps_path or not os.path.isfile(cps_path):
            return {"error": f"Post processor file not found: '{cps_path}'"}

        program_name = body.get("program_name", "O1001")
        output_folder = body.get("output_folder", os.path.join(os.environ.get("TEMP", "/tmp"), "prism-gcode"))
        os.makedirs(output_folder, exist_ok=True)

        output_units = body.get("output_units", "mm").lower()
        unit_option = (adsk.cam.PostOutputUnitOptions.MillimetersOutput
                       if output_units == "mm"
                       else adsk.cam.PostOutputUnitOptions.InchesOutput)

        try:
            post_input = adsk.cam.PostProcessInput.createInput(
                cps_path, program_name, output_folder, unit_option
            )
            cam.postProcess(setup, post_input)

            # Find generated file
            output_file = ""
            for f in os.listdir(output_folder):
                if program_name.lower() in f.lower():
                    output_file = os.path.join(output_folder, f)
                    break

            line_count = 0
            if output_file and os.path.isfile(output_file):
                with open(output_file, "r") as fh:
                    line_count = sum(1 for _ in fh)

            return {
                "success": True,
                "output_file": output_file,
                "program_name": program_name,
                "post_processor": os.path.basename(cps_path),
                "line_count": line_count,
            }
        except Exception as e:
            return {"error": str(e), "traceback": traceback.format_exc()}

    # ── B-Rep Geometry + Feature Candidates (P1-U05, P1-U06) ─────

    def _get_geometry_detail(self):
        """GET /cam/geometry-detail — Face-level B-Rep extraction."""
        design = self._get_design()
        root = design.rootComponent
        faces = []
        type_counts = {"planar": 0, "cylindrical": 0, "conical": 0, "spherical": 0, "toroidal": 0, "nurbs": 0}

        for bi in range(root.bRepBodies.count):
            body = root.bRepBodies.item(bi)
            for fi in range(body.faces.count):
                face = body.faces.item(fi)
                geom = face.geometry
                bb = face.boundingBox

                face_info = {
                    "index": fi,
                    "body_index": bi,
                    "body_name": body.name,
                    "area_mm2": round(face.area * 100, 3),  # cm² → mm²
                    "bounding_box_mm": {
                        "min": [round(bb.minPoint.x * 10, 3), round(bb.minPoint.y * 10, 3), round(bb.minPoint.z * 10, 3)],
                        "max": [round(bb.maxPoint.x * 10, 3), round(bb.maxPoint.y * 10, 3), round(bb.maxPoint.z * 10, 3)],
                    },
                }

                if isinstance(geom, adsk.core.Plane):
                    n = geom.normal
                    face_info["surface_type"] = "plane"
                    face_info["normal"] = [round(n.x, 6), round(n.y, 6), round(n.z, 6)]
                    type_counts["planar"] += 1
                elif isinstance(geom, adsk.core.Cylinder):
                    face_info["surface_type"] = "cylinder"
                    face_info["radius_mm"] = round(geom.radius * 10, 4)  # cm → mm
                    ax = geom.axis
                    face_info["axis"] = [round(ax.x, 6), round(ax.y, 6), round(ax.z, 6)]
                    face_info["is_hole"] = face.isParamReversed  # concave = hole
                    type_counts["cylindrical"] += 1
                elif isinstance(geom, adsk.core.Cone):
                    face_info["surface_type"] = "cone"
                    face_info["half_angle_deg"] = round(math.degrees(geom.halfAngle), 2)
                    type_counts["conical"] += 1
                elif isinstance(geom, adsk.core.Sphere):
                    face_info["surface_type"] = "sphere"
                    face_info["radius_mm"] = round(geom.radius * 10, 4)
                    type_counts["spherical"] += 1
                elif isinstance(geom, adsk.core.Torus):
                    face_info["surface_type"] = "torus"
                    face_info["major_radius_mm"] = round(geom.majorRadius * 10, 4)
                    face_info["minor_radius_mm"] = round(geom.minorRadius * 10, 4)
                    type_counts["toroidal"] += 1
                else:
                    face_info["surface_type"] = "nurbs"
                    type_counts["nurbs"] += 1

                faces.append(face_info)

        return {
            "body_count": root.bRepBodies.count,
            "face_count": len(faces),
            "faces": faces,
            "grouped_by_type": type_counts,
        }

    def _get_feature_candidates(self):
        """GET /cam/feature-candidates — Topology-based feature grouping for AutoProgram."""
        detail = self._get_geometry_detail()
        faces = detail.get("faces", [])
        features = []

        # Group cylindrical faces by axis → hole/boss candidates
        cylinders = [f for f in faces if f.get("surface_type") == "cylinder"]
        axis_groups = {}
        for cyl in cylinders:
            ax = tuple(round(v, 3) for v in cyl.get("axis", [0, 0, 1]))
            pos_key = tuple(round(v, 1) for v in cyl["bounding_box_mm"]["min"])
            key = (ax, round(cyl.get("radius_mm", 0), 2), pos_key)
            axis_groups.setdefault(key, []).append(cyl)

        for (axis, radius, pos), group in axis_groups.items():
            is_hole = any(f.get("is_hole", False) for f in group)
            # Estimate depth from bounding box
            bb_min = group[0]["bounding_box_mm"]["min"]
            bb_max = group[0]["bounding_box_mm"]["max"]
            depth = max(abs(bb_max[i] - bb_min[i]) for i in range(3))

            features.append({
                "type": "through_hole" if is_hole and depth > radius * 3 else "blind_hole" if is_hole else "boss_circular",
                "dimensions": {
                    "diameter_mm": round(radius * 2, 3),
                    "depth_mm": round(depth, 3),
                },
                "position": {"x": bb_min[0], "y": bb_min[1], "z": bb_min[2]},
                "confidence": 0.85 if is_hole else 0.70,
                "face_indices": [f["index"] for f in group],
            })

        # Top planar faces → face operations
        planar = [f for f in faces if f.get("surface_type") == "plane"]
        if planar:
            top_z = max(f["bounding_box_mm"]["max"][2] for f in planar)
            top_faces = [f for f in planar if abs(f["bounding_box_mm"]["max"][2] - top_z) < 0.1]
            if top_faces:
                total_area = sum(f["area_mm2"] for f in top_faces)
                features.append({
                    "type": "face",
                    "dimensions": {"area_mm2": round(total_area, 1)},
                    "position": {"x": 0, "y": 0, "z": top_z},
                    "confidence": 0.95,
                    "face_indices": [f["index"] for f in top_faces],
                })

        # Estimate complexity
        complexity = min(10, len(features) * 1.5 + detail.get("face_count", 0) * 0.05)

        return {
            "features": features,
            "feature_count": len(features),
            "complexity_score": round(complexity, 1),
            "estimated_operations": len(features) + 1,  # +1 for roughing
            "source_face_count": detail.get("face_count", 0),
        }

    # ── Cloud Library Access (P2-U07, P2-U08) ───────────────────

    def _list_data_projects(self):
        """GET /data/projects — List all Fusion 360 cloud projects."""
        app = adsk.core.Application.get()
        if not app.data:
            return {"error": "Data API not available", "projects": []}

        projects = []
        try:
            for i in range(app.data.dataProjects.count):
                proj = app.data.dataProjects.item(i)
                projects.append({
                    "id": proj.id if hasattr(proj, "id") else str(i),
                    "name": proj.name,
                    "index": i,
                })
        except Exception as e:
            return {"error": str(e), "projects": []}

        return {"projects": projects, "count": len(projects)}

    def _list_data_folder(self, body):
        """POST /data/folder/list — Traverse folder tree in a cloud project.
        Body: {"project_index": 0, "folder_path": "" (root), "max_depth": 3}
        """
        app = adsk.core.Application.get()
        if not app.data:
            return {"error": "Data API not available"}

        proj_idx = body.get("project_index", 0)
        folder_path = body.get("folder_path", "")
        max_depth = min(body.get("max_depth", 3), 10)
        max_files = body.get("max_files", 50)

        try:
            if proj_idx >= app.data.dataProjects.count:
                return {"error": f"Project index {proj_idx} out of range (have {app.data.dataProjects.count})"}
            proj = app.data.dataProjects.item(proj_idx)
            folder = proj.rootFolder

            # Navigate to subfolder if path provided (e.g., "Parts/Milling")
            if folder_path:
                for part in folder_path.split("/"):
                    part = part.strip()
                    if not part:
                        continue
                    found = False
                    for fi in range(folder.dataFolders.count):
                        sub = folder.dataFolders.item(fi)
                        if sub.name == part:
                            folder = sub
                            found = True
                            break
                    if not found:
                        return {"error": f"Folder not found: '{part}' in '{folder.name}'"}

            result = self._traverse_folder(folder, max_depth, max_files, 0)
            result["project_name"] = proj.name
            return result
        except Exception as e:
            return {"error": str(e)}

    def _traverse_folder(self, folder, max_depth, max_files, current_depth):
        """Recursively traverse a DataFolder, returning files and subfolders."""
        result = {
            "name": folder.name,
            "path": getattr(folder, "id", ""),
            "files": [],
            "subfolders": [],
            "truncated": False,
        }

        # Files in this folder
        try:
            file_count = folder.dataFiles.count
            for i in range(min(file_count, max_files)):
                df = folder.dataFiles.item(i)
                file_info = {
                    "name": df.name,
                    "id": getattr(df, "id", str(i)),
                    "extension": getattr(df, "fileExtension", ""),
                    "size_bytes": getattr(df, "size", 0),
                }
                try:
                    file_info["created"] = str(df.createdDate)
                except Exception:
                    pass
                try:
                    file_info["modified"] = str(df.modifiedDate)
                except Exception:
                    pass
                try:
                    file_info["version_count"] = df.versions.count if hasattr(df, "versions") and df.versions else 1
                except Exception:
                    file_info["version_count"] = 1
                result["files"].append(file_info)
            if file_count > max_files:
                result["truncated"] = True
                result["total_files_in_folder"] = file_count
        except Exception:
            pass

        # Subfolders (recurse if within depth limit)
        if current_depth < max_depth:
            try:
                for i in range(folder.dataFolders.count):
                    sub = folder.dataFolders.item(i)
                    sub_result = self._traverse_folder(sub, max_depth, max_files, current_depth + 1)
                    result["subfolders"].append(sub_result)
            except Exception:
                pass

        return result

    def _search_data_files(self, body):
        """POST /data/search — Search files by name across all cloud projects.
        Body: {"query": "bracket", "extension": "f3d", "max_results": 50}
        """
        app = adsk.core.Application.get()
        if not app.data:
            return {"error": "Data API not available"}

        query = body.get("query", "").lower()
        ext_filter = body.get("extension", "").lower()
        max_results = min(body.get("max_results", 50), 200)

        if not query:
            return {"error": "query parameter is required"}

        results = []

        try:
            for pi in range(app.data.dataProjects.count):
                if len(results) >= max_results:
                    break
                proj = app.data.dataProjects.item(pi)
                self._search_folder_recursive(
                    proj.rootFolder, proj.name, "", query, ext_filter,
                    results, max_results, 0, 10
                )
        except Exception as e:
            return {"error": str(e), "results": results}

        return {"results": results, "count": len(results), "query": query}

    def _search_folder_recursive(self, folder, proj_name, path_prefix, query, ext_filter, results, max_results, depth, max_depth):
        """Recursively search folder tree for files matching query."""
        if depth > max_depth or len(results) >= max_results:
            return

        current_path = f"{path_prefix}/{folder.name}" if path_prefix else folder.name

        try:
            for i in range(folder.dataFiles.count):
                if len(results) >= max_results:
                    return
                df = folder.dataFiles.item(i)
                name = df.name.lower()
                ext = getattr(df, "fileExtension", "").lower()

                if query in name:
                    if ext_filter and ext != ext_filter:
                        continue
                    file_info = {
                        "name": df.name,
                        "id": getattr(df, "id", ""),
                        "project": proj_name,
                        "path": current_path,
                        "extension": ext,
                        "size_bytes": getattr(df, "size", 0),
                    }
                    try:
                        file_info["modified"] = str(df.modifiedDate)
                    except Exception:
                        pass
                    results.append(file_info)
        except Exception:
            pass

        try:
            for i in range(folder.dataFolders.count):
                if len(results) >= max_results:
                    return
                sub = folder.dataFolders.item(i)
                self._search_folder_recursive(
                    sub, proj_name, current_path, query, ext_filter,
                    results, max_results, depth + 1, max_depth
                )
        except Exception:
            pass

    # ── Cloud File Metadata + CAM Extraction (P2-U08) ──────────────

    def _open_data_file(self, body):
        """POST /data/file/open — Open a cloud file into the Fusion workspace.
        Body: {"project_index": 0, "file_id": "..." OR "file_path": "Parts/bracket.f3d"}
        """
        app = adsk.core.Application.get()
        if not app.data:
            return {"error": "Data API not available"}

        proj_idx = body.get("project_index", 0)
        file_id = body.get("file_id", "")
        file_path = body.get("file_path", "")

        try:
            if proj_idx >= app.data.dataProjects.count:
                return {"error": f"Project index {proj_idx} out of range"}
            proj = app.data.dataProjects.item(proj_idx)

            data_file = None

            # Find by ID
            if file_id:
                data_file = self._find_file_by_id(proj.rootFolder, file_id, 0, 10)

            # Find by path (e.g., "Parts/Milling/bracket.f3d")
            if not data_file and file_path:
                parts = file_path.split("/")
                file_name = parts[-1]
                folder = proj.rootFolder
                for folder_part in parts[:-1]:
                    folder_part = folder_part.strip()
                    if not folder_part:
                        continue
                    found = False
                    for fi in range(folder.dataFolders.count):
                        sub = folder.dataFolders.item(fi)
                        if sub.name == folder_part:
                            folder = sub
                            found = True
                            break
                    if not found:
                        return {"error": f"Folder not found: '{folder_part}'"}

                for fi in range(folder.dataFiles.count):
                    df = folder.dataFiles.item(fi)
                    if df.name == file_name:
                        data_file = df
                        break

            if not data_file:
                return {"error": "File not found. Provide file_id or file_path."}

            # Open the file
            doc = app.documents.open(data_file)
            if not doc:
                return {"error": "Failed to open file"}
            adsk.doEvents()

            return {
                "success": True,
                "document_name": doc.name,
                "file_name": data_file.name,
                "file_id": getattr(data_file, "id", ""),
            }
        except Exception as e:
            return {"error": str(e)}

    def _find_file_by_id(self, folder, file_id, depth, max_depth):
        """Recursively search for a DataFile by ID."""
        if depth > max_depth:
            return None
        try:
            for i in range(folder.dataFiles.count):
                df = folder.dataFiles.item(i)
                if getattr(df, "id", "") == file_id:
                    return df
        except Exception:
            pass
        try:
            for i in range(folder.dataFolders.count):
                sub = folder.dataFolders.item(i)
                result = self._find_file_by_id(sub, file_id, depth + 1, max_depth)
                if result:
                    return result
        except Exception:
            pass
        return None

    def _get_data_file_metadata(self, body):
        """POST /data/file/metadata — Extract design + CAM info from active or specified file.
        Body: {"use_active": true} OR {"project_index": 0, "file_id": "..."}
        Returns: design features, bodies, sketches, parameters, CAM setups with ops/tools/S&F.
        """
        app = adsk.core.Application.get()
        use_active = body.get("use_active", True)

        doc = app.activeDocument if use_active else None
        if not doc:
            return {"error": "No active document. Open a file first via /data/file/open."}

        result = {
            "document_name": doc.name,
            "design": {},
            "cam": {"has_cam": False, "setups": []},
        }

        # Extract design info
        try:
            design = adsk.fusion.Design.cast(doc.products.itemByProductType("DesignProductType"))
            if design:
                root = design.rootComponent
                result["design"] = {
                    "body_count": root.bRepBodies.count,
                    "occurrence_count": root.occurrences.count,
                    "sketch_count": root.sketches.count,
                    "feature_count": root.features.count,
                    "parameter_count": design.allParameters.count,
                    "bodies": [],
                }
                for bi in range(min(root.bRepBodies.count, 20)):
                    b = root.bRepBodies.item(bi)
                    bb = b.boundingBox
                    result["design"]["bodies"].append({
                        "name": b.name,
                        "volume_mm3": round(b.volume * 1000, 3),
                        "area_mm2": round(b.area * 100, 3),
                        "face_count": b.faces.count,
                        "edge_count": b.edges.count,
                        "bounding_box_mm": {
                            "x": round((bb.maxPoint.x - bb.minPoint.x) * 10, 3),
                            "y": round((bb.maxPoint.y - bb.minPoint.y) * 10, 3),
                            "z": round((bb.maxPoint.z - bb.minPoint.z) * 10, 3),
                        },
                    })
        except Exception:
            pass

        # Extract CAM info
        try:
            cam_product = doc.products.itemByProductType("CAMProductType")
            if cam_product:
                cam = adsk.cam.CAM.cast(cam_product)
                if cam and cam.setups.count > 0:
                    result["cam"]["has_cam"] = True
                    result["cam"]["setup_count"] = cam.setups.count

                    for si in range(cam.setups.count):
                        setup = cam.setups.item(si)
                        setup_info = {
                            "name": setup.name,
                            "type": str(setup.setupType),
                            "operations": [],
                        }

                        try:
                            ops = setup.allOperations
                            for oi in range(ops.count):
                                op = ops.item(oi)
                                op_info = {
                                    "name": op.name,
                                    "type": getattr(op, "operationType", "unknown"),
                                    "strategy": getattr(op, "strategy", ""),
                                }

                                # Extract tool info
                                try:
                                    tool = op.tool
                                    if tool:
                                        op_info["tool"] = {
                                            "description": getattr(tool, "description", ""),
                                            "type": str(getattr(tool, "type", "")),
                                        }
                                        # Tool geometry
                                        try:
                                            geom = tool.geometry
                                            if geom:
                                                op_info["tool"]["diameter_mm"] = round(getattr(geom, "diameter", 0) * 10, 3)
                                                op_info["tool"]["flute_length_mm"] = round(getattr(geom, "fluteLength", 0) * 10, 3)
                                                op_info["tool"]["overall_length_mm"] = round(getattr(geom, "overallLength", 0) * 10, 3)
                                                op_info["tool"]["flute_count"] = getattr(geom, "numberOfFlutes", 0)
                                        except Exception:
                                            pass
                                except Exception:
                                    pass

                                # Extract S/F parameters
                                try:
                                    params = op.parameters
                                    sf = {}
                                    for pname, key in [
                                        ("tool_spindleSpeed", "rpm"),
                                        ("tool_feedCutting", "feed_mm_min"),
                                        ("maximumStepdown", "stepdown_mm"),
                                        ("maximumStepover", "stepover_mm"),
                                        ("tool_feedPlunge", "plunge_feed_mm_min"),
                                    ]:
                                        try:
                                            p = params.itemByName(pname)
                                            if p:
                                                val = p.value
                                                # Convert cm back to mm for feed/step values
                                                if key in ("feed_mm_min", "stepdown_mm", "stepover_mm", "plunge_feed_mm_min"):
                                                    val = round(val * 10, 3)
                                                else:
                                                    val = round(val, 1)
                                                sf[key] = val
                                        except Exception:
                                            pass
                                    if sf:
                                        op_info["speed_feed"] = sf
                                except Exception:
                                    pass

                                setup_info["operations"].append(op_info)
                        except Exception:
                            pass

                        result["cam"]["setups"].append(setup_info)
        except Exception:
            pass

        return result

    def _get_data_file_versions(self, body):
        """POST /data/file/versions — Get version history for a cloud file.
        Body: {"project_index": 0, "file_id": "..."} or uses active document.
        """
        app = adsk.core.Application.get()

        # Try to get DataFile from active document
        data_file = None
        use_active = body.get("use_active", True)
        if use_active and app.activeDocument:
            try:
                data_file = app.activeDocument.dataFile
            except Exception:
                pass

        # Or find by project/ID
        if not data_file:
            proj_idx = body.get("project_index", 0)
            file_id = body.get("file_id", "")
            if not file_id:
                return {"error": "Provide file_id or set use_active=true with an open document"}
            try:
                if proj_idx >= app.data.dataProjects.count:
                    return {"error": f"Project index {proj_idx} out of range"}
                proj = app.data.dataProjects.item(proj_idx)
                data_file = self._find_file_by_id(proj.rootFolder, file_id, 0, 10)
            except Exception as e:
                return {"error": str(e)}

        if not data_file:
            return {"error": "File not found"}

        result = {
            "file_name": data_file.name,
            "file_id": getattr(data_file, "id", ""),
            "versions": [],
        }

        try:
            versions = data_file.versions
            if versions:
                for vi in range(versions.count):
                    ver = versions.item(vi)
                    ver_info = {
                        "version_number": vi + 1,
                        "id": getattr(ver, "id", ""),
                    }
                    try:
                        ver_info["created"] = str(ver.createdDate)
                    except Exception:
                        pass
                    try:
                        ver_info["creator"] = getattr(ver, "createdBy", {})
                        if hasattr(ver_info["creator"], "name"):
                            ver_info["creator"] = ver_info["creator"].name
                        else:
                            ver_info["creator"] = str(ver_info["creator"])
                    except Exception:
                        ver_info["creator"] = ""
                    try:
                        ver_info["comment"] = getattr(ver, "description", "")
                    except Exception:
                        ver_info["comment"] = ""
                    result["versions"].append(ver_info)
                result["version_count"] = len(result["versions"])
                result["is_mature"] = len(result["versions"]) >= 8
        except Exception as e:
            result["error"] = f"Could not read versions: {str(e)}"

        return result

    # ── POST /atomic ─ CAD-FULL-COVERAGE-MS0 Wave L ────────────────────
    # Single dispatcher for the 139-op atomic-ops ontology defined in
    # H:/prism-slot-delta/scripts/cad-atomic-ops-ontology.mjs. Body shape:
    # {"op": "<op-id>", "args": {...}}. Handlers return {"success": bool, ...}.
    # P0 set wired now: 15 drawing.* + op.press-pull (closed-loop unblock).
    # Remaining ~85 ops fall through to a fail-loud "not yet wired" response so
    # the CADAtomicOpsEngine dispatcher knows what's still pending.

    def _dispatch_atomic(self, body):
        op = body.get("op", "")
        args = body.get("args", {}) or {}
        if not op:
            return {"success": False, "error": "Missing 'op' field"}
        if not isinstance(op, str):
            return {"success": False, "error": "'op' must be a string"}
        if not isinstance(args, dict):
            return {"success": False, "error": "'args' must be an object/dict"}
        handlers = {
            # Drawing workspace (Wave A) — closed-loop print generator
            "drawing.create-doc":     self._atomic_drawing_create_doc,
            "drawing.view-base":      self._atomic_drawing_view_base,
            "drawing.view-projected": self._atomic_drawing_view_projected,
            "drawing.view-section":   self._atomic_drawing_view_section,
            "drawing.view-detail":    self._atomic_drawing_view_detail,
            "drawing.auto-dimension": self._atomic_drawing_auto_dimension,
            "drawing.dim-linear":     self._atomic_drawing_dim_linear,
            "drawing.dim-angular":    self._atomic_drawing_dim_angular,
            "drawing.dim-radial":     self._atomic_drawing_dim_radial,
            "drawing.centerline":     self._atomic_drawing_centerline,
            "drawing.centermark":     self._atomic_drawing_centermark,
            "drawing.balloon":        self._atomic_drawing_balloon,
            "drawing.bom-table":      self._atomic_drawing_bom_table,
            "drawing.title-block":    self._atomic_drawing_title_block,
            "drawing.export-pdf":     self._atomic_drawing_export_pdf,
            # Solid Modify (Wave C)
            "op.press-pull":          self._atomic_op_press_pull,
        }
        handler = handlers.get(op)
        if handler is None:
            return {
                "success": False,
                "error": f"Atomic op '{op}' not wired in PRISMBridge yet",
                "wired_ops": sorted(handlers.keys()),
            }
        try:
            return handler(args)
        except Exception as e:
            return {
                "success": False,
                "op": op,
                "error": str(e),
                "traceback": traceback.format_exc(),
            }

    # ── /atomic helpers ────────────────────────────────────────────────

    def _get_active_drawing(self):
        """Return the active DrawingProduct or raise. Drawing must already exist."""
        if adsk.drawing is None:
            raise RuntimeError("adsk.drawing module unavailable in this Fusion install")
        app = adsk.core.Application.get()
        doc = app.activeDocument
        if not doc:
            raise RuntimeError("No active document. Create a drawing via drawing.create-doc first.")
        drawing = adsk.drawing.Drawing.cast(app.activeProduct)
        if not drawing:
            raise RuntimeError("Active product is not a Drawing. Switch to the drawing tab.")
        return drawing

    def _resolve_sheet(self, drawing, args):
        sheet_index = int(args.get("sheet_index", 0))
        if sheet_index < 0 or sheet_index >= drawing.sheets.count:
            raise RuntimeError(
                f"sheet_index {sheet_index} out of range (drawing has {drawing.sheets.count} sheets)"
            )
        return drawing.sheets.item(sheet_index)

    def _resolve_view(self, sheet, view_index):
        view_index = int(view_index)
        if view_index < 0 or view_index >= sheet.drawingViews.count:
            raise RuntimeError(
                f"view_index {view_index} out of range (sheet has {sheet.drawingViews.count} views)"
            )
        return sheet.drawingViews.item(view_index)

    def _point2d_from_mm(self, x_mm, y_mm):
        # Drawing API takes Point2D in centimeters (Fusion internal units)
        return adsk.core.Point2D.create(float(x_mm) / 10.0, float(y_mm) / 10.0)

    def _drawing_orientation(self, name):
        """Map string → adsk.drawing.ViewOrientations enum. R12 fail-loud on bad name."""
        if adsk.drawing is None:
            raise RuntimeError("adsk.drawing module unavailable")
        VO = adsk.drawing.ViewOrientations
        orient_map = {
            "front":      VO.FrontDrawingViewOrientation,
            "back":       VO.BackDrawingViewOrientation,
            "left":       VO.LeftDrawingViewOrientation,
            "right":      VO.RightDrawingViewOrientation,
            "top":        VO.TopDrawingViewOrientation,
            "bottom":     VO.BottomDrawingViewOrientation,
            "iso-top-left":    VO.IsoTopLeftDrawingViewOrientation,
            "iso-top-right":   VO.IsoTopRightDrawingViewOrientation,
            "iso-bottom-left": VO.IsoBottomLeftDrawingViewOrientation,
            "iso-bottom-right":VO.IsoBottomRightDrawingViewOrientation,
        }
        key = str(name).lower().strip()
        if key not in orient_map:
            raise RuntimeError(
                f"orientation '{name}' invalid. Valid: {sorted(orient_map.keys())}"
            )
        return orient_map[key]

    # ── /atomic handlers — Drawing workspace ───────────────────────────

    def _atomic_drawing_create_doc(self, args):
        """drawing.create-doc — create a new drawing document referencing the active design.
        args: {sheet_size: "A2"|"A3"|"A4"|...|"Letter"|"Tabloid",
               standard: "asme"|"iso", units: "mm"|"in"}"""
        if adsk.drawing is None:
            return {"success": False, "error": "adsk.drawing module unavailable"}
        app = adsk.core.Application.get()
        ref_doc = app.activeDocument
        if not ref_doc:
            return {"success": False, "error": "No active design to reference"}
        # Verify reference is a Fusion design (not already a drawing)
        ref_design = adsk.fusion.Design.cast(app.activeProduct)
        if not ref_design:
            return {"success": False, "error": "Active product is not a Fusion design"}

        std_map = {
            "asme": adsk.drawing.DrawingStandards.ASMEDrawingStandard,
            "iso":  adsk.drawing.DrawingStandards.ISODrawingStandard,
        }
        size_map = {
            "a0": adsk.drawing.DrawingSheetSizes.A0DrawingSheetSize,
            "a1": adsk.drawing.DrawingSheetSizes.A1DrawingSheetSize,
            "a2": adsk.drawing.DrawingSheetSizes.A2DrawingSheetSize,
            "a3": adsk.drawing.DrawingSheetSizes.A3DrawingSheetSize,
            "a4": adsk.drawing.DrawingSheetSizes.A4DrawingSheetSize,
            "letter":  adsk.drawing.DrawingSheetSizes.LetterDrawingSheetSize,
            "tabloid": adsk.drawing.DrawingSheetSizes.TabloidDrawingSheetSize,
            "ledger":  adsk.drawing.DrawingSheetSizes.LedgerDrawingSheetSize,
        }
        unit_map = {
            "mm": adsk.drawing.DrawingUnits.MillimeterDrawingUnit,
            "in": adsk.drawing.DrawingUnits.InchDrawingUnit,
        }

        std_key  = str(args.get("standard", "asme")).lower()
        size_key = str(args.get("sheet_size", "A3")).lower()
        unit_key = str(args.get("units", "mm")).lower()
        if std_key not in std_map:
            return {"success": False, "error": f"Bad standard '{std_key}'. Valid: {sorted(std_map.keys())}"}
        if size_key not in size_map:
            return {"success": False, "error": f"Bad sheet_size '{size_key}'. Valid: {sorted(size_map.keys())}"}
        if unit_key not in unit_map:
            return {"success": False, "error": f"Bad units '{unit_key}'. Valid: {sorted(unit_map.keys())}"}

        settings = adsk.drawing.DrawingSettingsInput.create(
            std_map[std_key], unit_map[unit_key], size_map[size_key]
        )
        drawing_doc = app.documents.add(
            adsk.core.DocumentTypes.DrawingDocumentType, ref_doc, True, settings
        )
        drawing = adsk.drawing.Drawing.cast(drawing_doc.products.itemByProductType("DrawingProductType"))
        if drawing is None:
            # Partial state — drawing doc exists but product cast failed. Try to close cleanly
            # so the operator's Fusion session isn't left with a half-formed drawing.
            try:
                drawing_doc.close(False)
            except Exception:
                pass
            return {
                "success": False,
                "error": "Drawing product cast returned None — drawing doc was rolled back",
            }
        return {
            "success": True,
            "drawing_doc_name": drawing_doc.name,
            "sheet_count": drawing.sheets.count,
            "standard": std_key,
            "sheet_size": size_key,
            "units": unit_key,
        }

    def _atomic_drawing_view_base(self, args):
        """drawing.view-base — add a base view referencing the source design.
        args: {sheet_index: 0, scale: 1.0, x_mm, y_mm,
               orientation: "front"|"top"|"iso-top-left"|..., style: "visible_only"|"hidden_visible"|"shaded"}"""
        drawing = self._get_active_drawing()
        sheet = self._resolve_sheet(drawing, args)
        # Resolve the source design reference. The drawing's parent Document (the active document
        # once create-doc has run) carries documentReferences pointing at the source design.
        # Different Fusion builds expose either .referencedDocument (Document) or .dataFile
        # (cloud-only DataFile). createBaseViewInput accepts either. Walk both, prefer the
        # Document handle so unsaved local designs still work.
        app = adsk.core.Application.get()
        drawing_doc = app.activeDocument
        ref_input = None
        if drawing_doc is not None and hasattr(drawing_doc, "documentReferences"):
            try:
                if drawing_doc.documentReferences.count > 0:
                    doc_ref = drawing_doc.documentReferences.item(0)
                    ref_input = getattr(doc_ref, "referencedDocument", None) \
                                or getattr(doc_ref, "dataFile", None)
            except Exception:
                ref_input = None
        if ref_input is None:
            return {
                "success": False,
                "error": "Could not resolve source design reference from active drawing — "
                         "drawing.create-doc must have been called with a live source design",
            }
        scale = float(args.get("scale", 1.0))
        position = self._point2d_from_mm(args.get("x_mm", 100), args.get("y_mm", 100))
        orientation = self._drawing_orientation(args.get("orientation", "front"))
        style_map = {
            "visible_only":   adsk.drawing.DrawingViewStyles.VisibleEdgesDrawingViewStyle,
            "hidden_visible": adsk.drawing.DrawingViewStyles.VisibleAndHiddenEdgesDrawingViewStyle,
            "shaded":         adsk.drawing.DrawingViewStyles.ShadedDrawingViewStyle,
        }
        style_key = str(args.get("style", "visible_only")).lower()
        if style_key not in style_map:
            return {"success": False, "error": f"Bad style '{style_key}'. Valid: {sorted(style_map.keys())}"}
        base_input = sheet.drawingViews.createBaseViewInput(ref_input)
        base_input.scale = scale
        base_input.position = position
        base_input.orientation = orientation
        base_input.style = style_map[style_key]
        view = sheet.drawingViews.add(base_input)
        return {
            "success": True,
            "view_index": sheet.drawingViews.count - 1,
            "view_name": view.name,
            "scale": scale,
            "orientation": str(args.get("orientation", "front")).lower(),
        }

    def _atomic_drawing_view_projected(self, args):
        """drawing.view-projected — projected view from a parent view.
        args: {sheet_index, parent_view_index, x_mm, y_mm, scale?} — direction inferred from offset.
        Per Fusion convention, projected views inherit parent scale by default; explicit scale
        is applied when provided and the API exposes ProjectedViewInput.scale."""
        drawing = self._get_active_drawing()
        sheet = self._resolve_sheet(drawing, args)
        parent = self._resolve_view(sheet, args.get("parent_view_index", 0))
        position = self._point2d_from_mm(args.get("x_mm", 200), args.get("y_mm", 100))
        proj_input = sheet.drawingViews.createProjectedViewInput(parent, position)
        scale_applied = False
        if "scale" in args:
            try:
                proj_input.scale = float(args["scale"])
                scale_applied = True
            except AttributeError:
                # Older Fusion build: ProjectedViewInput.scale not exposed — surface the no-op
                scale_applied = False
        view = sheet.drawingViews.add(proj_input)
        return {
            "success": True,
            "view_index": sheet.drawingViews.count - 1,
            "view_name": view.name,
            "parent_view": parent.name,
            "scale_applied": scale_applied,
            "scale_requested": args.get("scale"),
        }

    def _atomic_drawing_view_section(self, args):
        """drawing.view-section — section view through a parent view.
        R12-HONEST: a section requires a sketched section line on the parent view that the
        HTTP API cannot easily reference. Falls back to a text-command invocation."""
        app = adsk.core.Application.get()
        # The text command approach: invoke Drawing menu Section View — operator-driven
        # geometry placement. Returns success only if Fusion accepts the command.
        try:
            app.executeTextCommand("Commands.Start CreateSectionDrawingViewCmd")
            return {
                "success": True,
                "mode": "ui-text-command",
                "note": "Section line placement is interactive — operator must click two points on parent view",
            }
        except Exception as e:
            return {"success": False, "error": f"Text command failed: {e}"}

    def _atomic_drawing_view_detail(self, args):
        """drawing.view-detail — detail view from a circle boundary.
        args: {sheet_index, parent_view_index, center_x_mm, center_y_mm, radius_mm, scale, dest_x_mm, dest_y_mm}"""
        drawing = self._get_active_drawing()
        sheet = self._resolve_sheet(drawing, args)
        parent = self._resolve_view(sheet, args.get("parent_view_index", 0))
        center = self._point2d_from_mm(args.get("center_x_mm", 0), args.get("center_y_mm", 0))
        radius_cm = float(args.get("radius_mm", 10)) / 10.0
        dest = self._point2d_from_mm(args.get("dest_x_mm", 250), args.get("dest_y_mm", 100))
        scale = float(args.get("scale", 2.0))
        # Capability probe first — narrow check ONLY on the two API methods we depend on.
        # A broad try/except over the whole flow swallowed legit bad-arg errors (e.g. parent
        # is not a valid view object) and mis-reported them as "older Fusion build".
        api_available = (
            hasattr(sheet.drawingViews, "createDetailViewBoundaryInput") and
            hasattr(sheet.drawingViews, "createDetailViewInput")
        )
        if not api_available:
            app = adsk.core.Application.get()
            app.executeTextCommand("Commands.Start CreateDetailDrawingViewCmd")
            return {
                "success": True,
                "mode": "ui-text-command",
                "note": "Detail view API absent on this Fusion build — placement is interactive",
            }
        boundary = sheet.drawingViews.createDetailViewBoundaryInput(parent, center, radius_cm)
        detail_input = sheet.drawingViews.createDetailViewInput(parent, boundary, dest)
        detail_input.scale = scale
        view = sheet.drawingViews.add(detail_input)
        return {
            "success": True,
            "view_index": sheet.drawingViews.count - 1,
            "view_name": view.name,
            "scale": scale,
        }

    def _atomic_drawing_auto_dimension(self, args):
        """drawing.auto-dimension — R12-HONEST: Fusion has no direct auto-dim API.
        Issues the AutoDimension text command. The active view must be operator-selected."""
        app = adsk.core.Application.get()
        try:
            app.executeTextCommand("Commands.Start AutoDimension")
            return {
                "success": True,
                "mode": "ui-text-command",
                "note": "Auto-dim runs on the active view; ensure view is selected in Fusion UI",
            }
        except Exception as e:
            return {"success": False, "error": f"Text command failed: {e}"}

    def _atomic_drawing_dim_linear(self, args):
        """drawing.dim-linear — R12-HONEST: requires two entity refs on a view that the
        HTTP boundary cannot trivially encode. Falls back to text command."""
        app = adsk.core.Application.get()
        try:
            app.executeTextCommand("Commands.Start DistanceBetweenTwoEntitiesCmd")
            return {"success": True, "mode": "ui-text-command",
                    "note": "Linear dim placement is interactive — select two entities"}
        except Exception as e:
            return {"success": False, "error": f"Text command failed: {e}"}

    def _atomic_drawing_dim_angular(self, args):
        app = adsk.core.Application.get()
        try:
            app.executeTextCommand("Commands.Start AngularDimensionCmd")
            return {"success": True, "mode": "ui-text-command",
                    "note": "Angular dim placement is interactive — select two lines"}
        except Exception as e:
            return {"success": False, "error": f"Text command failed: {e}"}

    def _atomic_drawing_dim_radial(self, args):
        app = adsk.core.Application.get()
        try:
            app.executeTextCommand("Commands.Start RadialDimensionCmd")
            return {"success": True, "mode": "ui-text-command",
                    "note": "Radial dim placement is interactive — select arc/circle"}
        except Exception as e:
            return {"success": False, "error": f"Text command failed: {e}"}

    def _atomic_drawing_centerline(self, args):
        """drawing.centerline — R12-HONEST: needs two edge refs. Text-command fallback."""
        app = adsk.core.Application.get()
        try:
            app.executeTextCommand("Commands.Start CenterlineDrawingViewCmd")
            return {"success": True, "mode": "ui-text-command",
                    "note": "Centerline placement is interactive — select two parallel edges"}
        except Exception as e:
            return {"success": False, "error": f"Text command failed: {e}"}

    def _atomic_drawing_centermark(self, args):
        """drawing.centermark — R12-HONEST: needs circle ref. Text-command fallback."""
        app = adsk.core.Application.get()
        try:
            app.executeTextCommand("Commands.Start CenterMarkDrawingViewCmd")
            return {"success": True, "mode": "ui-text-command",
                    "note": "Centermark placement is interactive — select circular edge"}
        except Exception as e:
            return {"success": False, "error": f"Text command failed: {e}"}

    def _atomic_drawing_balloon(self, args):
        """drawing.balloon — for assemblies only. Text-command fallback."""
        app = adsk.core.Application.get()
        try:
            app.executeTextCommand("Commands.Start BalloonDrawingViewCmd")
            return {"success": True, "mode": "ui-text-command",
                    "note": "Balloon placement is interactive — select component instance in view"}
        except Exception as e:
            return {"success": False, "error": f"Text command failed: {e}"}

    def _atomic_drawing_bom_table(self, args):
        """drawing.bom-table — BOM/parts list. Text-command fallback (auto-builds from assembly).
        args: {x_mm, y_mm} — placement only; BOM rows come from active design assembly."""
        app = adsk.core.Application.get()
        try:
            app.executeTextCommand("Commands.Start PartsListCmd")
            return {"success": True, "mode": "ui-text-command",
                    "note": "BOM table placement is interactive — click insertion point"}
        except Exception as e:
            return {"success": False, "error": f"Text command failed: {e}"}

    def _atomic_drawing_title_block(self, args):
        """drawing.title-block — set a field via direct API.
        args: {sheet_index, field_name: "Title"|"DrawnBy"|"DrawingNumber"|..., value: "..."}"""
        drawing = self._get_active_drawing()
        sheet = self._resolve_sheet(drawing, args)
        field_name = str(args.get("field_name", "")).strip()
        value = str(args.get("value", ""))
        if not field_name:
            return {"success": False, "error": "Missing field_name"}
        try:
            tb = sheet.titleBlock
            fields = tb.fields
        except AttributeError as e:
            return {"success": False, "error": f"Title block API unavailable: {e}"}
        # Find field by name (case-insensitive); wrap value assignment so a read-only
        # or locked field surfaces explicitly rather than escaping to the outer dispatcher.
        field_set = False
        available = []
        assign_error = None
        for i in range(fields.count):
            try:
                f = fields.item(i)
                available.append(f.name)
                if f.name.lower() == field_name.lower():
                    f.value = value
                    field_set = True
                    break
            except Exception as e:
                assign_error = str(e)
                break
        if assign_error:
            return {
                "success": False,
                "error": f"Title block field assignment failed: {assign_error}",
                "field_name": field_name,
            }
        if not field_set:
            return {
                "success": False,
                "error": f"Title block field '{field_name}' not found",
                "available_fields": available,
            }
        return {"success": True, "field_name": field_name, "value": value}

    def _atomic_drawing_export_pdf(self, args):
        """⭐ drawing.export-pdf — closes the closed-loop CAD testing pipeline.
        args: {filepath: "C:/.../auto-print.pdf", sheets: [0,1,...] (default all),
               color: bool=False, dpi: int=300, scale: float=1.0}"""
        if adsk.drawing is None:
            return {"success": False, "error": "adsk.drawing module unavailable"}
        drawing = self._get_active_drawing()
        filepath = str(args.get("filepath", "")).strip()
        if not filepath:
            return {"success": False, "error": "Missing filepath"}
        # Ensure parent dir exists
        parent_dir = os.path.dirname(filepath)
        if parent_dir and not os.path.isdir(parent_dir):
            try:
                os.makedirs(parent_dir, exist_ok=True)
            except OSError as e:
                return {"success": False, "error": f"Could not create dir {parent_dir}: {e}"}

        export_mgr = drawing.exportManager
        pdf_opts = export_mgr.createPDFExportOptions(filepath)
        pdf_opts.useGivenScale = True
        pdf_opts.scale = float(args.get("scale", 1.0))
        pdf_opts.openPDF = False
        # Sheets: default = all. Surface explicitly when a filter was requested but the
        # build can't honor it (older Fusion exports all sheets regardless).
        requested_sheets = args.get("sheets")
        sheets_filter_applied = False
        sheets_filter_warning = None
        if isinstance(requested_sheets, list) and requested_sheets:
            sheet_objs = []
            for i in requested_sheets:
                idx = int(i)
                if 0 <= idx < drawing.sheets.count:
                    sheet_objs.append(drawing.sheets.item(idx))
            if sheet_objs:
                try:
                    pdf_opts.sheets = sheet_objs
                    sheets_filter_applied = True
                except AttributeError:
                    sheets_filter_warning = (
                        "sheets[] requested but pdf_opts.sheets unavailable on this Fusion build — "
                        "all sheets exported"
                    )
        try:
            ok = export_mgr.execute(pdf_opts)
            if not ok:
                return {"success": False, "error": "PDF export returned False"}
        except Exception as e:
            return {"success": False, "error": f"PDF export failed: {e}"}
        # Verify file exists
        size_bytes = os.path.getsize(filepath) if os.path.isfile(filepath) else 0
        if size_bytes == 0:
            return {"success": False, "error": f"PDF file empty or missing: {filepath}"}
        result = {
            "success": True,
            "filepath": filepath,
            "size_bytes": size_bytes,
            "sheet_count": drawing.sheets.count,
            "scale": pdf_opts.scale,
            "sheets_filter_requested": requested_sheets,
            "sheets_filter_applied": sheets_filter_applied,
        }
        if sheets_filter_warning:
            result["warning"] = sheets_filter_warning
        return result

    # ── /atomic handlers — Solid Modify ────────────────────────────────

    def _atomic_op_press_pull(self, args):
        """op.press-pull — the Fusion workhorse: extrude/cut by face drag.
        args: {body_index: 0, face_index: 0, distance_mm: 10.0,
               operation: "new"|"join"|"cut"|"intersect"}"""
        design = self._get_design()
        root = design.rootComponent
        body_index = int(args.get("body_index", 0))
        face_index = int(args.get("face_index", 0))
        distance_mm = float(args.get("distance_mm", 10.0))
        operation = str(args.get("operation", "join")).lower()

        if body_index < 0 or body_index >= root.bRepBodies.count:
            return {"success": False, "error": f"body_index {body_index} out of range ({root.bRepBodies.count} bodies)"}
        brep_body = root.bRepBodies.item(body_index)
        if face_index < 0 or face_index >= brep_body.faces.count:
            return {"success": False, "error": f"face_index {face_index} out of range ({brep_body.faces.count} faces on body)"}
        face = brep_body.faces.item(face_index)

        op_map = {
            "new":       adsk.fusion.FeatureOperations.NewBodyFeatureOperation,
            "join":      adsk.fusion.FeatureOperations.JoinFeatureOperation,
            "cut":       adsk.fusion.FeatureOperations.CutFeatureOperation,
            "intersect": adsk.fusion.FeatureOperations.IntersectFeatureOperation,
        }
        if operation not in op_map:
            return {"success": False, "error": f"Bad operation '{operation}'. Valid: {sorted(op_map.keys())}"}

        targets = adsk.core.ObjectCollection.create()
        targets.add(face)
        distance = adsk.core.ValueInput.createByReal(distance_mm / 10.0)
        feature = root.features.pressPullFeatures.add(targets, distance, op_map[operation])
        return {
            "success": True,
            "feature_name": feature.name,
            "body_count": root.bRepBodies.count,
            "distance_mm": distance_mm,
            "operation": operation,
        }

    # ── CAM Setup helpers ───────────────────────────────────────────

    def _find_setup(self, cam, name, index):
        """Find a CAM setup by name or index."""
        if name:
            for i in range(cam.setups.count):
                if cam.setups.item(i).name == name:
                    return cam.setups.item(i)
        if 0 <= index < cam.setups.count:
            return cam.setups.item(index)
        return None

    def _get_cam_setups(self):
        """List all CAM setups with metadata."""
        app = adsk.core.Application.get()
        cam = adsk.cam.CAM.cast(app.activeProduct)
        if not cam:
            return {"error": "No CAM product. Switch to MANUFACTURE workspace.", "setups": []}

        setup_types = {0: "Milling", 1: "Turning", 2: "Cutting"}
        result = []
        for i in range(cam.setups.count):
            setup = cam.setups.item(i)
            info = {
                "name": setup.name,
                "index": i,
                "type": setup_types.get(setup.setupType, str(setup.setupType)),
                "operation_count": 0,
                "model_count": 0,
            }
            try:
                info["operation_count"] = setup.allOperations.count
            except Exception:
                pass
            try:
                info["model_count"] = setup.models.count
            except Exception:
                pass
            # WCS origin
            try:
                origin = setup.parameters.itemByName("wcs_origin_boxPoint")
                if origin:
                    pt = origin.value
                    info["wcs_origin_mm"] = [pt.x * 10, pt.y * 10, pt.z * 10]
            except Exception:
                pass
            result.append(info)

        return {"setups": result, "count": len(result)}

    def _list_cam_operations(self, setup_filter=""):
        """GET /cam/operations — Enumerate every CAM operation across setups.

        Optional `name` query filters to a single setup. Returns operations with
        strategy, tool description, key speed/feed parameters, and toolpath
        generation state — the data CAM clients need before they can route a
        post-process or render a cycle-time table.
        """
        app = adsk.core.Application.get()
        cam = adsk.cam.CAM.cast(app.activeProduct)
        if not cam:
            return {"error": "No CAM product. Switch to MANUFACTURE workspace.", "operations": []}

        operations = []
        for i in range(cam.setups.count):
            setup = cam.setups.item(i)
            if setup_filter and setup.name != setup_filter:
                continue
            try:
                ops = setup.allOperations
            except Exception:
                continue
            for j in range(ops.count):
                try:
                    op = ops.item(j)
                except Exception:
                    continue
                op_info = {
                    "setup_name": setup.name,
                    "setup_index": i,
                    "operation_name": getattr(op, "name", ""),
                    "operation_index": j,
                    "operation_type": getattr(op, "operationType", None),
                    "strategy": getattr(op, "strategy", "") or "",
                }
                # Toolpath generation state — false means edits were made after
                # the last `Generate Toolpath`, so the cached G-code is stale.
                try:
                    op_info["is_toolpath_valid"] = bool(op.isToolpathValid)
                except Exception:
                    op_info["is_toolpath_valid"] = None
                try:
                    op_info["is_suppressed"] = bool(op.isSuppressed)
                except Exception:
                    op_info["is_suppressed"] = None
                # Tool — Fusion exposes tool via op.tool; not all op types have one.
                try:
                    tool = op.tool
                    if tool:
                        op_info["tool"] = {
                            "description": getattr(tool, "parameters", None).itemByName("tool_description").expression
                                if hasattr(tool, "parameters") else "",
                            "type": getattr(tool, "productId", "") or "",
                        }
                except Exception:
                    op_info["tool"] = None
                # Speed/feed — pull a small canonical subset rather than the full
                # parameter list (which can be 50+ entries).
                speed_feed = {}
                for key in ("tool_spindleSpeed", "tool_feedCutting", "tool_feedEntry",
                            "tool_stepdown", "tool_stepover"):
                    try:
                        param = op.parameters.itemByName(key)
                        if param:
                            speed_feed[key] = param.expression
                    except Exception:
                        continue
                if speed_feed:
                    op_info["speed_feed"] = speed_feed
                operations.append(op_info)

        return {"operations": operations, "count": len(operations)}

    def _get_cam_toolpath_validity(self, setup_filter=""):
        """GET /cam/toolpath/validity — Per-operation toolpath up-to-date check.

        Cheaper than re-running `Generate Toolpath` just to find out whether
        anything is dirty. Used by orchestrators to decide whether the output
        of a previous `_generate_cam_toolpath` job is still valid before posting.
        """
        app = adsk.core.Application.get()
        cam = adsk.cam.CAM.cast(app.activeProduct)
        if not cam:
            return {"error": "No CAM product.", "operations": []}

        operations = []
        valid_count = 0
        invalid_count = 0
        for i in range(cam.setups.count):
            setup = cam.setups.item(i)
            if setup_filter and setup.name != setup_filter:
                continue
            try:
                ops = setup.allOperations
            except Exception:
                continue
            for j in range(ops.count):
                try:
                    op = ops.item(j)
                    valid = bool(op.isToolpathValid)
                except Exception:
                    continue
                if valid:
                    valid_count += 1
                else:
                    invalid_count += 1
                operations.append({
                    "setup_name": setup.name,
                    "operation_name": getattr(op, "name", ""),
                    "operation_index": j,
                    "is_toolpath_valid": valid,
                })

        return {
            "operations": operations,
            "valid_count": valid_count,
            "invalid_count": invalid_count,
            "all_valid": invalid_count == 0 and valid_count > 0,
        }

    def _get_cam_cycle_time(self, setup_filter=""):
        """GET /cam/cycle-time — Cycle-time estimate per operation + setup totals.

        Reads `operation.cycleTime` (seconds) when Fusion has computed it. An
        operation that has never been generated returns 0; callers should check
        `_get_cam_toolpath_validity` first if they need an authoritative number.
        """
        app = adsk.core.Application.get()
        cam = adsk.cam.CAM.cast(app.activeProduct)
        if not cam:
            return {"error": "No CAM product.", "setups": []}

        setups_out = []
        grand_total = 0.0
        for i in range(cam.setups.count):
            setup = cam.setups.item(i)
            if setup_filter and setup.name != setup_filter:
                continue
            ops_out = []
            setup_total = 0.0
            try:
                ops = setup.allOperations
            except Exception:
                continue
            for j in range(ops.count):
                try:
                    op = ops.item(j)
                    sec = float(getattr(op, "cycleTime", 0.0) or 0.0)
                except Exception:
                    sec = 0.0
                setup_total += sec
                ops_out.append({
                    "operation_name": getattr(op, "name", ""),
                    "operation_index": j,
                    "cycle_time_sec": round(sec, 3),
                    "cycle_time_min": round(sec / 60.0, 3),
                })
            grand_total += setup_total
            setups_out.append({
                "setup_name": setup.name,
                "setup_index": i,
                "operations": ops_out,
                "setup_cycle_time_sec": round(setup_total, 3),
                "setup_cycle_time_min": round(setup_total / 60.0, 3),
            })

        return {
            "setups": setups_out,
            "total_cycle_time_sec": round(grand_total, 3),
            "total_cycle_time_min": round(grand_total / 60.0, 3),
        }

    def _get_cam_materials(self):
        """GET /cam/materials — Materials available in the active document.

        Surfaces both the design's body materials (used by stock + part bodies)
        and any per-operation material references inside CAM. PRISM uses this
        to confirm Fusion's notion of the active material matches the Kienzle
        material PRISM has loaded for force/feed calculation.
        """
        app = adsk.core.Application.get()
        design = adsk.fusion.Design.cast(app.activeProduct)
        body_materials = []
        if design:
            try:
                mats = design.materials
                for i in range(mats.count):
                    m = mats.item(i)
                    body_materials.append({
                        "name": getattr(m, "name", "") or "",
                        "id": getattr(m, "id", "") or "",
                        "appearance": getattr(getattr(m, "appearance", None), "name", "") or "",
                    })
            except Exception:
                pass

            # Body-level material assignments — what each body actually uses.
            body_assignments = []
            try:
                root = design.rootComponent
                for i in range(root.bRepBodies.count):
                    body = root.bRepBodies.item(i)
                    try:
                        mat = body.material
                        body_assignments.append({
                            "body_name": body.name,
                            "body_index": i,
                            "material_name": getattr(mat, "name", "") if mat else "",
                            "material_id": getattr(mat, "id", "") if mat else "",
                        })
                    except Exception:
                        body_assignments.append({"body_name": body.name, "body_index": i, "material_name": "", "material_id": ""})
            except Exception:
                body_assignments = []
        else:
            body_assignments = []

        # CAM-side: each setup's stock body has a material; expose for Kienzle alignment.
        cam = adsk.cam.CAM.cast(app.activeProduct)
        cam_setup_materials = []
        if cam:
            for i in range(cam.setups.count):
                setup = cam.setups.item(i)
                stock_mat = ""
                try:
                    stock_param = setup.parameters.itemByName("job_stockMaterial")
                    if stock_param:
                        stock_mat = stock_param.expression or ""
                except Exception:
                    pass
                cam_setup_materials.append({
                    "setup_name": setup.name,
                    "setup_index": i,
                    "stock_material": stock_mat,
                })

        return {
            "body_materials": body_materials,
            "body_assignments": body_assignments,
            "cam_setup_materials": cam_setup_materials,
            "count": len(body_materials),
        }

    def _get_cam_setup_stock(self, name, index):
        """Get stock definition from a CAM setup."""
        app = adsk.core.Application.get()
        cam = adsk.cam.CAM.cast(app.activeProduct)
        if not cam:
            return {"error": "No CAM product. Switch to MANUFACTURE workspace."}

        setup = self._find_setup(cam, name, index)
        if not setup:
            return {"error": f"Setup not found: name='{name}' index={index}"}

        result = {"setup_name": setup.name}

        # Stock parameters
        try:
            params = setup.parameters
            for pname in ("stock_size_width", "stock_size_height", "stock_size_depth"):
                try:
                    p = params.itemByName(pname)
                    if p:
                        result[pname + "_mm"] = round(p.value * 10.0, 3)
                except Exception:
                    pass
            for pname in ("stock_offset_top", "stock_offset_bottom", "stock_offset_sides"):
                try:
                    p = params.itemByName(pname)
                    if p:
                        result[pname + "_mm"] = round(p.value * 10.0, 3)
                except Exception:
                    pass
            try:
                mode_p = params.itemByName("stock_mode")
                if mode_p:
                    result["stock_mode"] = mode_p.expression
            except Exception:
                pass
        except Exception:
            pass

        # Model bounding box for stock inference
        try:
            models = setup.models
            if models and models.count > 0:
                min_x = min_y = min_z = float('inf')
                max_x = max_y = max_z = float('-inf')
                total_vol = 0
                for j in range(models.count):
                    body = models.item(j)
                    bb = body.boundingBox
                    min_x = min(min_x, bb.minPoint.x)
                    min_y = min(min_y, bb.minPoint.y)
                    min_z = min(min_z, bb.minPoint.z)
                    max_x = max(max_x, bb.maxPoint.x)
                    max_y = max(max_y, bb.maxPoint.y)
                    max_z = max(max_z, bb.maxPoint.z)
                    total_vol += body.volume
                result["model_bounding_box_mm"] = {
                    "width": round((max_x - min_x) * 10, 3),
                    "height": round((max_y - min_y) * 10, 3),
                    "depth": round((max_z - min_z) * 10, 3),
                }
                result["model_volume_mm3"] = round(total_vol * 1000, 3)
        except Exception:
            pass

        return result

    def _get_cam_setup_bodies(self, name, index):
        """Get model and fixture bodies from a CAM setup."""
        app = adsk.core.Application.get()
        cam = adsk.cam.CAM.cast(app.activeProduct)
        if not cam:
            return {"error": "No CAM product. Switch to MANUFACTURE workspace."}

        setup = self._find_setup(cam, name, index)
        if not setup:
            return {"error": f"Setup not found: name='{name}' index={index}"}

        result = {"setup_name": setup.name, "models": [], "fixtures": []}

        # Model bodies (parts being machined)
        try:
            models = setup.models
            for j in range(models.count):
                body = models.item(j)
                bb = body.boundingBox
                result["models"].append({
                    "name": body.name,
                    "volume_mm3": round(body.volume * 1000, 3),
                    "area_mm2": round(body.area * 100, 3),
                    "bounding_box_mm": [
                        round((bb.maxPoint.x - bb.minPoint.x) * 10, 3),
                        round((bb.maxPoint.y - bb.minPoint.y) * 10, 3),
                        round((bb.maxPoint.z - bb.minPoint.z) * 10, 3),
                    ],
                })
        except Exception:
            pass

        # Fixture bodies
        try:
            fixtures = getattr(setup, "fixtureModels", None)
            if fixtures:
                for j in range(fixtures.count):
                    body = fixtures.item(j)
                    bb = body.boundingBox
                    result["fixtures"].append({
                        "name": body.name,
                        "volume_mm3": round(body.volume * 1000, 3),
                        "bounding_box_mm": [
                            round((bb.maxPoint.x - bb.minPoint.x) * 10, 3),
                            round((bb.maxPoint.y - bb.minPoint.y) * 10, 3),
                            round((bb.maxPoint.z - bb.minPoint.z) * 10, 3),
                        ],
                    })
        except Exception:
            pass

        return result

    # ── Edge selection helper ────────────────────────────────────────

    def _select_edges(self, body, selection):
        """Select edges from a body by keyword or index list."""
        all_edges = [body.edges.item(i) for i in range(body.edges.count)]

        if isinstance(selection, list):
            return [all_edges[i] for i in selection if i < len(all_edges)]

        if selection == "all":
            return all_edges

        # Filter by position relative to bounding box
        bb = body.boundingBox
        mid_z = (bb.minPoint.z + bb.maxPoint.z) / 2
        top_z = bb.maxPoint.z
        bot_z = bb.minPoint.z
        tol = (top_z - bot_z) * 0.1 if (top_z - bot_z) > 0 else 0.01

        result = []
        for edge in all_edges:
            ebb = edge.boundingBox
            edge_min_z = ebb.minPoint.z
            edge_max_z = ebb.maxPoint.z

            if selection == "top":
                if abs(edge_min_z - top_z) < tol and abs(edge_max_z - top_z) < tol:
                    result.append(edge)
            elif selection == "bottom":
                if abs(edge_min_z - bot_z) < tol and abs(edge_max_z - bot_z) < tol:
                    result.append(edge)
            elif selection == "vertical":
                # Match edges that are primarily vertical (Z-aligned)
                edge_height = abs(edge_max_z - edge_min_z)
                body_height = top_z - bot_z
                if body_height > 0 and edge_height > body_height * 0.3:
                    # Also check that X/Y extent is small (it's a vertical line)
                    x_span = abs(ebb.maxPoint.x - ebb.minPoint.x)
                    y_span = abs(ebb.maxPoint.y - ebb.minPoint.y)
                    if x_span < tol and y_span < tol:
                        result.append(edge)
        return result


# ── HTTP Handler (thin proxy — dispatches to main thread) ───────────

class FusionAPIHandler(BaseHTTPRequestHandler):
    """Receives HTTP requests and proxies them to the Fusion 360 main thread."""

    def log_message(self, format, *args):
        """Suppress default stderr logging."""
        pass

    def do_OPTIONS(self):
        """CORS preflight handler."""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "http://localhost:3000")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # /health is safe from any thread — skip dispatch for speed
        if path == "/health":
            self._respond({"status": "ok", "port": PORT})
            return

        result = _run_on_main_thread("GET", path, query=query)
        status = 404 if "error" in result and "Unknown endpoint" in str(result.get("error", "")) else 200
        self._respond(result, status)

    def do_POST(self):
        MAX_BODY = 10 * 1024 * 1024  # 10 MB
        try:
            content_length = int(self.headers.get("Content-Length", 0))
        except (ValueError, TypeError):
            self._respond({"error": "Invalid Content-Length"}, 400)
            return
        if content_length > MAX_BODY:
            self._respond({"error": "Request body too large"}, 413)
            return
        try:
            body = json.loads(self.rfile.read(content_length)) if content_length > 0 else {}
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._respond({"error": "Invalid JSON in request body"}, 400)
            return
        path = urlparse(self.path).path

        result = _run_on_main_thread("POST", path, body=body)
        status = 404 if "error" in result and "Unknown endpoint" in str(result.get("error", "")) else 200
        self._respond(result, status)

    def do_DELETE(self):
        path = urlparse(self.path).path

        result = _run_on_main_thread("DELETE", path)
        status = 404 if "error" in result and "Unknown endpoint" in str(result.get("error", "")) else 200
        self._respond(result, status)

    def _respond(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "http://localhost:3000")
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode("utf-8"))


# ── Threaded HTTP Server ─────────────────────────────────────────────

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Multi-threaded HTTP server. Allows /health to respond while long
    operations block on main-thread dispatch. Thread safety for Fusion API
    calls is handled by _dispatch_lock + CustomEvent, not by the server."""
    daemon_threads = True


# ── Add-in Lifecycle ─────────────────────────────────────────────────

def run(context):
    """Called by Fusion 360 when the add-in starts."""
    global _app, _ui, _server, _server_thread, _custom_event, _custom_event_handler
    try:
        _app = adsk.core.Application.get()
        _ui = _app.userInterface

        # Register custom event for thread-safe dispatch
        _custom_event = _app.registerCustomEvent(CUSTOM_EVENT_ID)
        _custom_event_handler = _MainThreadHandler()
        _custom_event.add(_custom_event_handler)

        _server = ThreadedHTTPServer(("127.0.0.1", PORT), FusionAPIHandler)
        _server_thread = threading.Thread(target=_server.serve_forever, daemon=True)
        _server_thread.start()

        _ui.messageBox(f"PRISM Bridge started on port {PORT}")
    except Exception:
        if _ui:
            _ui.messageBox(f"PRISM Bridge failed to start:\n{traceback.format_exc()}")


def stop(context):
    """Called by Fusion 360 when the add-in stops."""
    global _server, _ui, _custom_event, _custom_event_handler
    try:
        if _server:
            _server.shutdown()
            _server = None
        if _custom_event:
            _app.unregisterCustomEvent(CUSTOM_EVENT_ID)
            _custom_event = None
            _custom_event_handler = None
        if _ui:
            _ui.messageBox("PRISM Bridge stopped")
    except Exception:
        if _ui:
            _ui.messageBox(f"PRISM Bridge stop error:\n{traceback.format_exc()}")
