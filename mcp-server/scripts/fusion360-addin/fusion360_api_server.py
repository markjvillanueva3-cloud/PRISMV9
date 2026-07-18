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
  3. Server starts on http://localhost:18365

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
  GET  /cam/operation/parameters -- Enumerate an op's CAMParameters (names/value/strategy) — READ-ONLY verify-before-bind keystone (navmap #3)
  POST /cam/operation/edit    -- Mutate an existing op's params in place by exact Fusion name (navmap #5; iterative re-author)
  POST /cam/operation/delete  -- Remove one op via deleteMe() — explicit target required (navmap #7)
  POST /cam/operation/reorder -- Move an op to a new index — capability-detected/best-effort (navmap #7)
"""
import adsk.core
import adsk.fusion
import adsk.cam
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

PORT = 18365
CUSTOM_EVENT_ID = "PRISMBridgeDispatch"
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
_prism_scratch_docs = []  # Fusion Document objects PRISM created as throwaway scratch.
# Closed (discard-only) on cleanup so driving Fusion never leaks hundreds of windows /
# RAM / CPU / GPU (R14 "close your tool calls" applied to Fusion docs). CROSS-SLOT-SAFE:
# both PRISM add-ins (:18365 kilo/CAM, :18362 delta/CAD) share ONE app.documents, so we
# ONLY ever close docs registered here by THIS process's /new — delta's live CAD docs are
# never registered and never touched. saveChanges is ALWAYS False for scratch (disposable).
_scratch_seq = 0  # monotonic scratch-name counter — never reused after a close (unique names)
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

def _register_scratch_doc(doc):
    """Track a PRISM-created scratch document so cleanup can close it (discard-only).

    Identity-deduped (Fusion objects don't always support ``==``, so compare by ``is``).
    Best-effort also stamps a document attribute so the doc is recognizable as PRISM
    scratch even if this process's registry is lost (e.g. add-in reload).
    """
    try:
        for d in _prism_scratch_docs:
            if d is doc:
                return
    except Exception:
        pass
    _prism_scratch_docs.append(doc)
    try:
        doc.attributes.add("PRISM_DRIVE", "scratch", "1")
    except Exception:
        pass


def _safe_remove_scratch(doc):
    """Drop a doc from the scratch registry (identity match, fail-soft)."""
    try:
        _prism_scratch_docs[:] = [d for d in _prism_scratch_docs if d is not doc]
    except Exception:
        pass


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
        elif path == "/cam/operation/parameters":
            return self._list_cam_operation_parameters(query)
        elif path == "/data/projects":
            return self._list_data_projects()
        # ── Backend navigation (read-only) — delta(CAD) + echo(post) ──
        elif path == "/design/tree":
            return self._design_tree()
        elif path == "/design/features":
            return self._design_features()
        elif path == "/design/parameters":
            return self._design_parameters()
        elif path == "/design/selection":
            return self._design_selection()
        elif path == "/post/library":
            return self._post_library()
        elif path == "/post/programs":
            return self._post_programs()
        elif path == "/documents":
            return self._list_documents()
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
            "/undo": lambda b: self._undo(),
            "/new": self._new_document,
            "/parameter": self._handle_parameter,
            "/tool-import": self._import_tools,
            "/viewport/capture": self._capture_viewport,
            "/doc/save": self._save_document,
            "/doc/save-as": self._save_document_as,
            "/doc/close": self._close_document,
            "/cam/setup": self._create_cam_setup,
            "/cam/operation": self._create_cam_operation,
            "/cam/operation/edit": self._edit_cam_operation,        # navmap #5 — mutate existing op params
            "/cam/operation/delete": self._delete_cam_operation,    # navmap #7 — remove an op (deleteMe)
            "/cam/operation/reorder": self._reorder_cam_operation,  # navmap #7 — move op (best-effort/capability-detected)
            "/cam/assign-tool": self._assign_cam_tool,
            "/cam/toolpath": self._generate_cam_toolpath,
            "/cam/post": self._cam_post_process,
            "/data/folder/list": self._list_data_folder,
            "/data/search": self._search_data_files,
            "/data/file/open": self._open_data_file,
            "/data/file/metadata": self._get_data_file_metadata,
            "/data/file/versions": self._get_data_file_versions,
            "/component/insert": self._insert_component,
            "/component/list": self._list_occurrences,
            "/component/joint": self._create_joint,
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
        """Get the Fusion 360 design product, raising if none.

        Resolves the Design product by product type, not just app.activeProduct,
        so geometry reads work regardless of the active workspace. In the
        MANUFACTURE workspace activeProduct is the CAM product (not the design),
        which made every geometry read fail with "not a Fusion design". This
        mirrors the by-type lookup _create_cam_setup already relies on.
        """
        app = adsk.core.Application.get()
        doc = app.activeDocument
        if not doc:
            raise RuntimeError("No active document. Use POST /new first.")
        design = adsk.fusion.Design.cast(app.activeProduct)
        if not design:
            design = adsk.fusion.Design.cast(
                doc.products.itemByProductType("DesignProductType")
            )
        if not design:
            raise RuntimeError("Active product is not a Fusion design.")
        return design

    # ── GET /status ──────────────────────────────────────────────────

    def _get_status(self):
        app = adsk.core.Application.get()
        doc = app.activeDocument
        design = None
        if doc:
            design = adsk.fusion.Design.cast(app.activeProduct) or adsk.fusion.Design.cast(
                doc.products.itemByProductType("DesignProductType")
            )
        result = {
            "status": "connected",
            "version": app.version,
            "document": doc.name if doc else None,
            "component_count": 0,
            "body_count": 0,
            "timeline_count": 0,
        }
        # Capture cloud DataFile identity when saved so the driver can cache the
        # file_id and reopen instantly via Data.findFileById (zero enumeration).
        if doc:
            try:
                if getattr(doc, "isSaved", False) and doc.dataFile:
                    result["data_file_id"] = getattr(doc.dataFile, "id", "")
                    result["data_file_name"] = doc.dataFile.name
                    result["is_saved"] = True
                else:
                    result["is_saved"] = bool(getattr(doc, "isSaved", False))
            except Exception:
                result["is_saved"] = None
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

    def _capture_viewport(self, body):
        """POST /viewport/capture — Save the active viewport to a PNG so the
        driver can VISUALLY verify state (catch gross-visual errors the
        structured API can't flag: oversized holder, toolpath missing a
        feature, wrong setup orientation). Verification layer, not control."""
        app = adsk.core.Application.get()
        vp = app.activeViewport
        if not vp:
            return {"error": "No active viewport"}

        orient_map = {
            "iso": adsk.core.ViewOrientations.IsoTopRightViewOrientation,
            "top": adsk.core.ViewOrientations.TopViewOrientation,
            "bottom": adsk.core.ViewOrientations.BottomViewOrientation,
            "front": adsk.core.ViewOrientations.FrontViewOrientation,
            "back": adsk.core.ViewOrientations.BackViewOrientation,
            "left": adsk.core.ViewOrientations.LeftViewOrientation,
            "right": adsk.core.ViewOrientations.RightViewOrientation,
        }
        orientation = str(body.get("orientation", "")).lower()
        if orientation in orient_map:
            try:
                cam = vp.camera
                cam.viewOrientation = orient_map[orientation]
                cam.isFitView = True
                vp.camera = cam  # reassign to apply
                adsk.doEvents()
            except Exception:
                pass  # orientation is best-effort; fall back to current view

        try:
            width = int(body.get("width", 1600))
            height = int(body.get("height", 1000))
        except (ValueError, TypeError):
            width, height = 1600, 1000
        width = max(64, min(width, 4096))
        height = max(64, min(height, 4096))

        out_dir = os.path.join(os.environ.get("TEMP", "/tmp"), "prism-viz")
        os.makedirs(out_dir, exist_ok=True)
        name = os.path.basename(str(body.get("name", "viewport"))) or "viewport"
        if not name.lower().endswith(".png"):
            name += ".png"
        out_path = os.path.join(out_dir, name)

        try:
            ok = vp.saveAsImageFile(out_path, width, height)
        except Exception as e:
            return {"error": f"saveAsImageFile raised: {e}", "path": out_path}
        if not ok or not os.path.isfile(out_path):
            return {"error": "saveAsImageFile returned false / no file", "path": out_path}
        return {
            "success": True,
            "path": out_path,
            "width": width,
            "height": height,
            "orientation": orientation or "current",
        }

    def _save_document(self, body):
        """POST /doc/save — Save the active document (must already have been
        saved once; use /doc/save-as for the first save)."""
        app = adsk.core.Application.get()
        doc = app.activeDocument
        if not doc:
            return {"error": "No active document"}
        if not doc.isSaved:
            return {"error": "Document never saved — use /doc/save-as first (Fusion requires a name + folder for the initial save)"}
        try:
            ok = doc.save(str(body.get("description", "")))
        except Exception as e:
            return {"error": f"save raised: {e}", "traceback": traceback.format_exc()}
        return {"success": bool(ok), "name": doc.name, "isSaved": doc.isSaved}

    def _save_document_as(self, body):
        """POST /doc/save-as — Save the active document under a NEW name into a
        Fusion project folder, leaving the original untouched (SOP step 2).
        Fusion saveAs is cloud/Data-panel based (DataFolder), NOT a local path."""
        app = adsk.core.Application.get()
        doc = app.activeDocument
        if not doc:
            return {"error": "No active document"}
        name = body.get("name")
        if not name:
            return {"error": "Missing 'name'"}

        # Resolve target DataFolder: prefer the active doc's own folder (copy
        # lands beside the original); else the active project root.
        folder = None
        try:
            if doc.isSaved and doc.dataFile:
                folder = doc.dataFile.parentFolder
        except Exception:
            folder = None
        if not folder:
            try:
                proj = app.data.activeProject
                folder = proj.rootFolder if proj else None
            except Exception:
                folder = None
        if not folder:
            return {"error": "No target folder (no active Fusion project). Activate a project in the Data panel first."}

        try:
            ok = doc.saveAs(str(name), folder, str(body.get("description", "")), str(body.get("tag", "")))
        except Exception as e:
            return {"error": f"saveAs raised: {e}", "traceback": traceback.format_exc()}
        return {
            "success": bool(ok),
            "name": doc.name,
            "folder": getattr(folder, "name", ""),
            "isSaved": doc.isSaved,
        }

    # ── GET /documents · POST /doc/close (window-leak prevention, R14) ──

    def _is_scratch_doc(self, doc):
        """True if doc is a PRISM throwaway: registered this session, OR carries the
        PRISM_DRIVE/scratch attribute, OR is named with the PRISM scratch prefix.
        Used to gate auto-close so delta's live CAD docs are never discarded."""
        try:
            for d in _prism_scratch_docs:
                if d is doc:
                    return True
        except Exception:
            pass
        try:
            if doc.attributes.itemByName("PRISM_DRIVE", "scratch") is not None:
                return True
        except Exception:
            pass
        try:
            nm = doc.name or ""
            if nm.startswith("PRISM-SCRATCH") or nm.startswith("PRISM_CAM"):
                return True
        except Exception:
            pass
        return False

    def _list_documents(self):
        """GET /documents — enumerate every open Fusion document with its save/modified
        state and whether PRISM owns it as scratch. Lets cleanup see what would be closed
        BEFORE acting (and surfaces window pile-up to the operator)."""
        app = adsk.core.Application.get()
        docs = app.documents
        try:
            active = app.activeDocument
        except Exception:
            active = None
        out = []
        try:
            count = docs.count
        except Exception:
            count = 0
        for i in range(min(count, 500)):
            try:
                d = docs.item(i)
            except Exception:
                continue
            out.append({
                "index": i,
                "name": self._nav_safe(lambda: d.name, "?"),
                "isSaved": self._nav_safe(lambda: bool(d.isSaved), None),
                "isModified": self._nav_safe(lambda: bool(d.isModified), None),
                "isActive": bool(active is not None and d is active),
                "prismScratch": self._nav_safe(lambda: self._is_scratch_doc(d), False),
            })
        return {
            "documents": out,
            "count": len(out),
            "scratchCount": sum(1 for x in out if x.get("prismScratch")),
            "registeredScratch": len(_prism_scratch_docs),
        }

    def _close_document(self, body):
        """POST /doc/close — close documents to stop window pile-up (R14).

        target (default "scratch"):
          • "scratch" — close ONLY PRISM scratch docs registered this session, discard-only
            (saveChanges always False). Cross-slot-safe: delta's docs are never registered,
            so this can never lose CAD work. A scratch doc that was promoted (isSaved) is
            skipped, not discarded.
          • "active"  — close the active document. Refuses to discard a MODIFIED non-scratch
            doc unless force:true (or saveChanges:true to save first).
          • "name"    — close the open doc whose name matches body.name (same safety guard).
        """
        app = adsk.core.Application.get()
        target = str(body.get("target", "scratch")).lower()
        save_changes = bool(body.get("saveChanges", False))
        force = bool(body.get("force", False))

        if target == "scratch":
            closed, skipped, errors = [], [], []
            for doc in list(_prism_scratch_docs):
                try:
                    nm = doc.name
                except Exception:
                    _safe_remove_scratch(doc)  # stale ref — already gone
                    continue
                try:
                    if doc.isSaved:
                        # Promoted to a real saved part — never discard it.
                        skipped.append({"name": nm, "reason": "isSaved (promoted to real part)"})
                        _safe_remove_scratch(doc)
                        continue
                    doc.close(False)  # discard — scratch is disposable
                    closed.append(nm)
                    _safe_remove_scratch(doc)
                except Exception as e:
                    errors.append({"name": nm, "error": str(e)})
            return {
                "success": True, "target": "scratch",
                "closed": closed, "closedCount": len(closed),
                "skipped": skipped, "errors": errors,
            }

        if target == "active":
            doc = app.activeDocument
            if not doc:
                return {"error": "No active document"}
            nm = self._nav_safe(lambda: doc.name, "?")
            modified = self._nav_safe(lambda: bool(doc.isModified), False)
            if (not save_changes) and modified and (not self._is_scratch_doc(doc)) and (not force):
                return {"error": "Refusing to discard a modified non-scratch document. "
                                 "Pass force:true to discard, or saveChanges:true to save first.",
                        "name": nm}
            try:
                doc.close(save_changes)
                _safe_remove_scratch(doc)
                return {"success": True, "closed": [nm], "savedChanges": save_changes}
            except Exception as e:
                return {"error": f"close raised: {e}", "name": nm}

        if target == "name":
            name = body.get("name")
            if not name:
                return {"error": "Missing 'name' for target=name"}
            docs = app.documents
            try:
                count = docs.count
            except Exception:
                count = 0
            for i in range(count):
                try:
                    d = docs.item(i)
                except Exception:
                    continue
                if self._nav_safe(lambda: d.name, None) == name:
                    modified = self._nav_safe(lambda: bool(d.isModified), False)
                    if (not save_changes) and modified and (not self._is_scratch_doc(d)) and (not force):
                        return {"error": "Refusing to discard a modified non-scratch document. "
                                         "force:true to discard.", "name": name}
                    try:
                        d.close(save_changes)
                        _safe_remove_scratch(d)
                        return {"success": True, "closed": [name], "savedChanges": save_changes}
                    except Exception as e:
                        return {"error": f"close raised: {e}", "name": name}
            return {"error": f"No open document named {name}"}

        return {"error": f"Unknown target '{target}' (use scratch|active|name)"}

    # ── Backend navigation (read-only) ───────────────────────────────
    # delta(CAD-design) + echo(post) navigation surface so PRISM AI can query
    # backend state by id/path instead of screenshots / blind API probing.

    @staticmethod
    def _nav_safe(fn, default=None):
        """Call fn(); swallow any Fusion-API error and return default. Keeps a
        navigation read total — one bad entity never blanks the whole tree."""
        try:
            return fn()
        except Exception:
            return default

    def _design_length_unit(self, design):
        """The design's own default length unit ('in','mm','cm'...). Reported on
        every geometry read so a metric doc can never be misread as inch (25.4x)."""
        return (self._nav_safe(lambda: design.unitsManager.defaultLengthUnits)
                or self._nav_safe(lambda: design.fusionUnitsManager.defaultLengthUnits))

    def _bbox_in(self, ent):
        """Bounding box of an entity in INCH (Fusion internal length is cm)."""
        bb = self._nav_safe(lambda: ent.boundingBox)
        if not bb:
            return None
        return {
            "min": [bb.minPoint.x / 2.54, bb.minPoint.y / 2.54, bb.minPoint.z / 2.54],
            "max": [bb.maxPoint.x / 2.54, bb.maxPoint.y / 2.54, bb.maxPoint.z / 2.54],
        }

    def _design_tree(self):
        """GET /design/tree — the browser backend: root component (bodies +
        sketches + construction-geom counts) and every occurrence (flat,
        depth-capped) with full path, grounded/visible state, and INCH bbox.
        The id/path navigation surface that replaces screenshotting the tree."""
        try:
            design = self._get_design()
        except Exception as e:
            return {"error": str(e)}
        root = design.rootComponent

        def comp_summary(comp):
            bodies = []
            for i in range(comp.bRepBodies.count):
                b = comp.bRepBodies.item(i)
                is_solid = self._nav_safe(lambda: b.isSolid, None)
                bodies.append({
                    "index": i,
                    "name": self._nav_safe(lambda: b.name),
                    "is_visible": self._nav_safe(lambda: b.isVisible),
                    "is_solid": is_solid,
                    # cm^3 -> in^3 (2.54^3 = 16.387064); only meaningful for solids
                    "volume_in3": self._nav_safe(lambda: b.volume / 16.387064) if is_solid else None,
                    "bbox_in": self._bbox_in(b),
                    "face_count": self._nav_safe(lambda: b.faces.count, 0),
                })
            sketches = []
            for i in range(comp.sketches.count):
                s = comp.sketches.item(i)
                sketches.append({
                    "index": i,
                    "name": self._nav_safe(lambda: s.name),
                    "is_visible": self._nav_safe(lambda: s.isVisible),
                    "profile_count": self._nav_safe(lambda: s.profiles.count, 0),
                    "is_fully_constrained": self._nav_safe(lambda: s.isFullyConstrained),
                })
            return {
                "name": comp.name,
                "body_count": comp.bRepBodies.count,
                "sketch_count": comp.sketches.count,
                "bodies": bodies,
                "sketches": sketches,
                "construction": {
                    "planes": self._nav_safe(lambda: comp.constructionPlanes.count, 0),
                    "axes": self._nav_safe(lambda: comp.constructionAxes.count, 0),
                    "points": self._nav_safe(lambda: comp.constructionPoints.count, 0),
                },
            }

        occs = []
        truncated = False
        MAX_OCC = 500
        try:
            flat = root.allOccurrences
            total = flat.count
            for i in range(min(total, MAX_OCC)):
                occ = flat.item(i)
                occs.append({
                    "full_path": self._nav_safe(lambda: occ.fullPathName),
                    "name": self._nav_safe(lambda: occ.name),
                    "component_name": self._nav_safe(lambda: occ.component.name),
                    "is_grounded": self._nav_safe(lambda: occ.isGrounded),
                    "is_visible": self._nav_safe(lambda: occ.isLightBulbOn),
                    "body_count": self._nav_safe(lambda: occ.bRepBodies.count, 0),
                    "bbox_in": self._bbox_in(occ),
                })
            truncated = total > MAX_OCC
        except Exception as e:
            return {"error": str(e), "partial_occurrences": occs}

        return {
            "document": self._nav_safe(lambda: adsk.core.Application.get().activeDocument.name),
            "design_length_unit": self._design_length_unit(design),
            "root_component": comp_summary(root),
            "occurrences": occs,
            "occurrence_count": len(occs),
            "occurrence_truncated": truncated,
            "timeline_count": self._nav_safe(lambda: design.timeline.count, 0),
        }

    def _design_features(self):
        """GET /design/features — the timeline backend: ordered features with
        entity type, suppression and health. Reveals the part's build recipe so
        PRISM AI can reason about edit order without opening the timeline UI."""
        try:
            design = self._get_design()
        except Exception as e:
            return {"error": str(e)}
        tl = design.timeline
        total = self._nav_safe(lambda: tl.count, 0)
        items = []
        MAX = 1000
        for i in range(min(total, MAX)):
            it = tl.item(i)
            entity = self._nav_safe(lambda: it.entity)
            items.append({
                "index": i,
                "name": self._nav_safe(lambda: it.name),
                "entity_type": self._nav_safe(lambda: entity.objectType) if entity else None,
                "entity_name": self._nav_safe(lambda: entity.name) if entity else None,
                "is_suppressed": self._nav_safe(lambda: it.isSuppressed),
                "health_state": self._nav_safe(lambda: int(it.healthState)),
            })
        return {"feature_count": total, "features": items, "truncated": total > MAX}

    def _design_parameters(self):
        """GET /design/parameters — the parametric backend: user parameters +
        model parameters (name, expression, internal value, unit, comment).
        Expressions are the human form ('2.5 in'); value is Fusion-internal
        (cm/rad). Lets PRISM AI drive parameter edits by name, never by clicking."""
        try:
            design = self._get_design()
        except Exception as e:
            return {"error": str(e)}

        def dump(pcoll, kind, cap):
            out = []
            n = self._nav_safe(lambda: pcoll.count, 0)
            for i in range(min(n, cap)):
                p = pcoll.item(i)
                out.append({
                    "kind": kind,
                    "name": self._nav_safe(lambda: p.name),
                    "expression": self._nav_safe(lambda: p.expression),
                    "value": self._nav_safe(lambda: p.value),
                    "unit": self._nav_safe(lambda: p.unit),
                    "comment": self._nav_safe(lambda: p.comment),
                })
            return out, n

        user, user_n = self._nav_safe(lambda: dump(design.userParameters, "user", 1000), ([], 0))
        allp, all_n = self._nav_safe(lambda: dump(design.allParameters, "model", 2000), ([], 0))
        return {
            "user_parameter_count": user_n,
            "user_parameters": user,
            "all_parameter_count": all_n,
            "all_parameters": allp,
            "all_truncated": all_n > 2000,
        }

    def _design_selection(self):
        """GET /design/selection — the live UI selection so PRISM AI knows what
        the operator picked (e.g. a parting face) without a screenshot. Each
        entry carries type, name, owning body/component and INCH bbox."""
        app = adsk.core.Application.get()
        ui = self._nav_safe(lambda: app.userInterface)
        if not ui:
            return {"error": "no userInterface"}
        sels = []
        try:
            active = ui.activeSelections
            for i in range(active.count):
                ent = active.item(i).entity
                sels.append({
                    "index": i,
                    "entity_type": self._nav_safe(lambda: ent.objectType),
                    "name": self._nav_safe(lambda: ent.name),
                    "body": self._nav_safe(lambda: ent.body.name),
                    "component": self._nav_safe(
                        lambda: ent.assemblyContext.component.name if ent.assemblyContext
                        else ent.body.parentComponent.name),
                    "bbox_in": self._bbox_in(ent),
                })
        except Exception as e:
            return {"error": str(e), "selections": sels}
        return {"selection_count": len(sels), "selections": sels}

    def _post_library(self):
        """GET /post/library — enumerate installed post configurations across
        every Fusion library location (Fusion-shipped + Local + Cloud 'My Posts').
        The .cps backend so PRISM AI selects a post by url/leaf, never by browsing
        the Post Library dialog. Depth-capped, total-bounded, fully fail-soft."""
        try:
            cam_mgr = adsk.cam.CAMManager.get()
            post_lib = cam_mgr.libraryManager.postLibrary
        except Exception as e:
            return {"error": "post library unavailable: " + str(e)}
        loc_enum = adsk.cam.LibraryLocations
        locations = []
        MAX_POSTS = 500
        for loc_name in ("Fusion360LibraryLocation", "LocalLibraryLocation",
                         "CloudLibraryLocation", "ExternalLibraryLocation"):
            loc_val = getattr(loc_enum, loc_name, None)
            if loc_val is None:
                continue
            root_url = self._nav_safe(lambda: post_lib.urlByLocation(loc_val))
            if not root_url:
                continue
            posts = []

            def walk(url, depth):
                if depth > 5 or len(posts) >= MAX_POSTS:
                    return
                for au in (self._nav_safe(lambda: list(post_lib.childAssetURLs(url)), []) or []):
                    if len(posts) >= MAX_POSTS:
                        break
                    posts.append({
                        "leaf": self._nav_safe(lambda: au.leafName),
                        "url": self._nav_safe(lambda: au.toString()),
                    })
                for fu in (self._nav_safe(lambda: list(post_lib.childFolderURLs(url)), []) or []):
                    walk(fu, depth + 1)

            walk(root_url, 0)
            locations.append({
                "location": loc_name,
                "root_url": self._nav_safe(lambda: root_url.toString()),
                "post_count": len(posts),
                "posts": posts,
                "truncated": len(posts) >= MAX_POSTS,
            })
        return {"location_count": len(locations), "locations": locations}

    def _post_programs(self):
        """GET /post/programs — NC Programs in the active document: assigned post,
        operation count, output settings. Empty (with a note) when the document
        has no Manufacture data — that is a state, not an error. Best-effort across
        Fusion versions (NCProgram shape varies) — every field is fail-soft."""
        app = adsk.core.Application.get()
        doc = self._nav_safe(lambda: app.activeDocument)
        if not doc:
            return {"error": "No active document."}
        cam = self._nav_safe(lambda: adsk.cam.CAM.cast(
            doc.products.itemByProductType("CAMProductType")))
        if not cam:
            return {"ncprogram_count": 0, "ncprograms": [],
                    "note": "no Manufacture (CAM) product in this document"}
        ncs = self._nav_safe(lambda: cam.ncPrograms)
        n = self._nav_safe(lambda: ncs.count, 0)
        progs = []
        for i in range(n):
            p = ncs.item(i)
            progs.append({
                "index": i,
                "name": self._nav_safe(lambda: p.name),
                "post_url": self._nav_safe(lambda: p.postConfiguration.toString()),
                "operation_count": self._nav_safe(lambda: p.operations.count, 0),
            })
        return {"ncprogram_count": n, "ncprograms": progs}

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
        revolution_axis = body.get("revolution_axis", "Z")

        if root.bRepBodies.count == 0:
            return {"success": False, "error": "No bodies in design"}

        target_body = root.bRepBodies.item(body.get("body_index", 0))
        edges = self._select_edges(target_body, edge_selection, revolution_axis)
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
        revolution_axis = body.get("revolution_axis", "Z")

        if root.bRepBodies.count == 0:
            return {"success": False, "error": "No bodies in design"}

        target_body = root.bRepBodies.item(body.get("body_index", 0))
        edges = self._select_edges(target_body, edge_selection, revolution_axis)
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

        # Security: block path traversal and UNC paths
        if ".." in export_path or export_path.startswith("\\\\"):
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

        # Scratch-by-default when UNNAMED: an unnamed PRISM-created doc is a
        # throwaway used only for driving Fusion, so register it for discard-only
        # cleanup (prevents window pile-up). A named doc — or explicit scratch:false
        # — is treated as intentional and is NOT auto-closed. Caller can also force
        # scratch:true on a named doc.
        doc_name = body.get("name", "")
        is_scratch = bool(body.get("scratch", not doc_name))
        if is_scratch and not doc_name:
            global _scratch_seq
            _scratch_seq += 1
            doc_name = "PRISM-SCRATCH-%d" % _scratch_seq
        if doc_name:
            try:
                doc.name = doc_name
            except Exception:
                pass
        if is_scratch:
            _register_scratch_doc(doc)

        return {
            "success": True,
            "document_name": doc.name,
            "design_type": "parametric" if design.designType == adsk.fusion.DesignTypes.ParametricDesignType else "direct",
            "scratch": is_scratch,
        }

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

            # Assign model bodies. SetupInput.models expects a PYTHON LIST of
            # BRepBody — NOT an adsk.core.ObjectCollection. The SWIG binding
            # rejects an ObjectCollection here ("argument 2 of type
            # std::vector<Ptr<Base>>"); this surfaced on the first live drive of
            # a real part (CAM-DRIVE-MS0 was wired but never run on a live seat).
            design = adsk.fusion.Design.cast(doc.products.itemByProductType("DesignProductType"))
            models = []
            if design:
                root = design.rootComponent
                body_indices = body.get("model_body_indices", [0])
                for idx in body_indices:
                    if 0 <= idx < root.bRepBodies.count:
                        models.append(root.bRepBodies.item(idx))
                if models:
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
                "model_count": len(models),
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
            # Create the operation. In this Fusion CAM API the factory is
            # Operations.createInput(strategy) on the setup's operations
            # collection — NOT Setup.createOperationInput (which does not exist;
            # surfaced on the first live op-create). Strategy string comes from
            # OPERATION_TYPE_MAP (e.g. "face", "adaptive", "drill").
            op_input = setup.operations.createInput(fusion_cmd)
            new_op = setup.operations.add(op_input)

            # Set parameters (mapped PRISM keys — auto-converted via CAM_PARAM_MAP factor)
            params = body.get("parameters", {})
            params_set = 0
            warnings = []
            set_list = []
            failed_list = []
            for prism_key, (fusion_key, factor) in CAM_PARAM_MAP.items():
                val = params.get(prism_key)
                if val is not None:
                    try:
                        p = new_op.parameters.itemByName(fusion_key)
                        if p:
                            p.expression = str(val * factor)
                            params_set += 1
                            set_list.append(fusion_key)
                        else:
                            warnings.append(f"Parameter '{fusion_key}' not found for operation type '{fusion_cmd}'")
                            failed_list.append({"param": fusion_key, "reason": "not_found"})
                    except Exception as pe:
                        warnings.append(f"Failed to set '{fusion_key}': {str(pe)}")
                        failed_list.append({"param": fusion_key, "reason": str(pe)})

            # Set arbitrary Fusion-NATIVE params (CAM-DRIVE-MS0/U-CAM-DRIVE-PARAM-EXPAND).
            # Full-parameter drive: any catalog-enumerated CAMParameter can be set here by
            # its exact Fusion name. NO conversion factor — the caller supplies a ready
            # expression (e.g. "5000", "0.5 cm"). Per-param try/except; never aborts the op.
            raw_params = body.get("raw_parameters", {})
            if isinstance(raw_params, dict):
                for fusion_key, expr in raw_params.items():
                    if expr is None:
                        continue
                    try:
                        p = new_op.parameters.itemByName(fusion_key)
                        if p:
                            p.expression = str(expr)
                            params_set += 1
                            set_list.append(fusion_key)
                        else:
                            warnings.append(f"Parameter '{fusion_key}' not found for operation type '{fusion_cmd}'")
                            failed_list.append({"param": fusion_key, "reason": "not_found"})
                    except Exception as pe:
                        warnings.append(f"Failed to set '{fusion_key}': {str(pe)}")
                        failed_list.append({"param": fusion_key, "reason": str(pe)})

            adsk.doEvents()

            return {
                "success": True,
                "operation_name": new_op.name,
                "operation_type": op_type,
                "fusion_command": fusion_cmd,
                "setup_name": setup.name,
                "parameters_set": params_set,
                "warnings": warnings,
                "set": set_list,
                "failed": failed_list,
            }
        except Exception as e:
            return {"error": str(e), "traceback": traceback.format_exc()}

    def _list_cam_operation_parameters(self, query):
        """GET /cam/operation/parameters — enumerate an EXISTING operation's CAMParameters
        (name/title/expression/value/type) so a driver can VALIDATE param names before blind-
        setting them, and confirm the real .strategy string. Navmap endpoint #3 — the
        verify-before-bind KEYSTONE that flips matrix fusion_strategy_verified false->true.
        READ-ONLY: creates and mutates nothing. Resolve target by setup_name|setup_index +
        op_name|op_index. Per-param fail-soft (one odd parameter never aborts the dump)."""
        query = query or {}  # GET with no query string -> {} (never deref None)
        app = adsk.core.Application.get()
        cam = adsk.cam.CAM.cast(app.activeProduct)
        if not cam:
            return {"error": "No CAM product. Switch to MANUFACTURE workspace."}

        def _q(key, default=""):
            v = query.get(key, [default])
            return (v[0] if isinstance(v, list) else v) or default

        setup_name = _q("setup_name", "")
        setup_index = int(_q("setup_index", "0") or "0")
        setup = self._find_setup(cam, setup_name, setup_index)
        if not setup:
            return {"error": f"Setup not found: name='{setup_name}' index={setup_index}"}

        # Resolve the operation by name (preferred) or index within the setup.
        op_name = _q("op_name", "")
        op_index = int(_q("op_index", "0") or "0")
        ops = setup.operations
        target = None
        if op_name:
            for i in range(ops.count):
                o = ops.item(i)
                if o.name == op_name:
                    target = o
                    break
            if target is None:
                return {"error": f"Operation not found by name='{op_name}' in setup '{setup.name}'"}
        else:
            if op_index < 0 or op_index >= ops.count:
                return {"error": f"op_index {op_index} out of range (setup '{setup.name}' has {ops.count} operations)"}
            target = ops.item(op_index)

        # Enumerate the operation's CAMParameters — read-only, per-param fail-soft (the names
        # are the load-bearing output; never assume a CAMParameterValue subtype's accessors).
        params = []
        try:
            coll = target.parameters
            for i in range(coll.count):
                p = coll.item(i)
                entry = {"name": getattr(p, "name", None)}
                for attr in ("title", "expression", "isEnabled"):
                    try:
                        entry[attr] = getattr(p, attr)
                    except Exception:
                        entry[attr] = None
                try:
                    pv = p.value
                    entry["value_type"] = type(pv).__name__
                    try:
                        entry["value"] = pv.value
                    except Exception:
                        entry["value"] = None
                    for opt_attr in ("choices", "enumValues", "options"):
                        try:
                            if getattr(pv, opt_attr, None) is not None:
                                entry["options_attr"] = opt_attr
                                break
                        except Exception:
                            pass
                except Exception:
                    entry["value_type"] = None
                    entry["value"] = None
                params.append(entry)
        except Exception as e:
            return {"error": f"Failed to enumerate parameters: {str(e)}", "traceback": traceback.format_exc()}

        return {
            "success": True,
            "setup_name": setup.name,
            "operation_name": target.name,
            "strategy": getattr(target, "strategy", None),
            "parameter_count": len(params),
            "parameters": params,
            "note": "READ-ONLY parameter dump (navmap endpoint #3). Use these EXACT names to bind geometry/tool-axis/turning params; flip matrix fusion_strategy_verified=true once .strategy here matches the family's mapped strategy.",
        }

    def _resolve_cam_op(self, cam, setup_name, setup_index, op_name, op_index, require_explicit=False):
        """Shared op resolver for the lifecycle endpoints (#5 edit / #7 delete+reorder).
        Returns (setup, op, None) on success or (None, None, {error}) on failure.

        SAFETY (R12): op_name is None = "key absent" (→ resolve by index); op_name provided-but-
        EMPTY/whitespace is a loud error — never silently fall through to index 0 when the caller
        clearly meant a named target (the destructive-target hole). op_index is coerced to int with
        a loud error (a string "1" must not throw an uncaught TypeError mid-delete). require_explicit
        =True additionally refuses an implicit index-0 fallback — a DELETE/REORDER must name its
        target, never silently hit 'the first op'."""
        setup = self._find_setup(cam, setup_name or "", setup_index or 0)
        if not setup:
            return None, None, {"error": f"Setup not found: name='{setup_name}' index={setup_index}"}
        ops = setup.operations

        # Provided-but-empty op_name → loud error (do NOT degrade a named-target intent to index).
        if op_name is not None and not str(op_name).strip():
            return None, None, {"error": "op_name/operation_name was provided but empty — name the target explicitly (refusing to fall through to an index)."}
        if op_name:
            for i in range(ops.count):
                o = ops.item(i)
                if o.name == op_name:
                    return setup, o, None
            return None, None, {"error": f"Operation not found by name='{op_name}' in setup '{setup.name}'"}

        # No name given. For destructive ops we demand an explicit op_index (the caller must opt in),
        # never an implicit 0 — deleting/reordering the wrong op is unrecoverable in a live doc.
        if require_explicit and op_index is None:
            return None, None, {"error": "Refusing implicit target: pass op_name or an explicit op_index (destructive op must name its target)."}
        # Coerce op_index to int (JSON usually gives int, but a string '1' must fail loud, not TypeError
        # on the bounds check below — matches reorder's target_index handling for one consistent rule).
        if op_index is None:
            idx = 0
        else:
            try:
                idx = int(op_index)
            except (TypeError, ValueError):
                return None, None, {"error": f"op_index must be an integer, got {op_index!r}"}
        if idx < 0 or idx >= ops.count:
            return None, None, {"error": f"op_index {idx} out of range (setup '{setup.name}' has {ops.count} operations)"}
        return setup, ops.item(idx), None

    def _edit_cam_operation(self, body):
        """POST /cam/operation/edit (navmap #5) — mutate an EXISTING operation's CAMParameters in
        place. Sets `raw_parameters` {exactFusionName: expression} via the SAME itemByName/.expression
        mechanism proven in _create_cam_operation — NO conversion factor, NO hardcoded [INFER] names:
        the caller supplies #3-VERIFIED names + ready expressions (e.g. {"stepover": "0.4 in"}). This
        is what makes authoring iterative (a wrong-param op can be corrected, not only recreated) and
        is the write-half of the closed-loop optimize regimen. Per-param fail-soft; never aborts the op;
        touches ONLY the named params (all others untouched). Idempotent. READ-ONLY on geometry/tool."""
        app = adsk.core.Application.get()
        cam = adsk.cam.CAM.cast(app.activeProduct)
        if not cam:
            return {"error": "No CAM product. Switch to MANUFACTURE workspace."}

        setup, op, err = self._resolve_cam_op(
            cam, body.get("setup_name", ""), body.get("setup_index", 0),
            body.get("op_name", body.get("operation_name")), body.get("op_index"))
        if err:
            return err

        raw_params = body.get("raw_parameters", {})
        if not isinstance(raw_params, dict):
            return {"error": "raw_parameters must be an object {fusionName: expression}"}

        set_list, failed_list, warnings = [], [], []
        try:
            for fusion_key, expr in raw_params.items():
                if expr is None:
                    continue
                try:
                    p = op.parameters.itemByName(fusion_key)
                    if p:
                        p.expression = str(expr)
                        set_list.append(fusion_key)
                    else:
                        warnings.append(f"Parameter '{fusion_key}' not found on operation '{op.name}'")
                        failed_list.append({"param": fusion_key, "reason": "not_found"})
                except Exception as pe:
                    warnings.append(f"Failed to set '{fusion_key}': {str(pe)}")
                    failed_list.append({"param": fusion_key, "reason": str(pe)})
            adsk.doEvents()
        except Exception as e:
            return {"error": str(e), "traceback": traceback.format_exc()}

        return {
            "success": True,
            "setup_name": setup.name,
            "operation_name": op.name,
            "parameters_set": len(set_list),
            "set": set_list,
            "failed": failed_list,
            "warnings": warnings,
            "note": "Edited in place. Toolpath is now DIRTY — regenerate via POST /cam/toolpath before posting. Param names must match #3 (GET /cam/operation/parameters); unknown names are reported in 'failed', never guessed.",
        }

    def _delete_cam_operation(self, body):
        """POST /cam/operation/delete (navmap #7) — remove ONE operation from a setup via the
        standard Fusion object idiom `deleteMe()`. SAFETY: refuses an implicit target — the caller
        MUST pass op_name or an explicit op_index (never silently deletes the first/last op).
        Returns the deleted op's name + the remaining operation count for verification."""
        app = adsk.core.Application.get()
        cam = adsk.cam.CAM.cast(app.activeProduct)
        if not cam:
            return {"error": "No CAM product. Switch to MANUFACTURE workspace."}

        setup, op, err = self._resolve_cam_op(
            cam, body.get("setup_name", ""), body.get("setup_index", 0),
            body.get("op_name", body.get("operation_name")), body.get("op_index"),
            require_explicit=True)
        if err:
            return err

        deleted_name = op.name
        try:
            ok = op.deleteMe()
            adsk.doEvents()
        except Exception as e:
            return {"error": f"deleteMe() failed for '{deleted_name}': {str(e)}", "traceback": traceback.format_exc()}
        if ok is False:
            return {"error": f"deleteMe() returned False for '{deleted_name}' (Fusion refused the delete)"}
        return {
            "success": True,
            "setup_name": setup.name,
            "deleted_operation": deleted_name,
            "remaining_operations": setup.operations.count,
            "note": "Operation removed. If it was mid-program, verify downstream ops still bind their geometry.",
        }

    def _reorder_cam_operation(self, body):
        """POST /cam/operation/reorder (navmap #7) — move an operation to a new position in the
        setup's operation list. HONEST/BEST-EFFORT: Fusion's adsk.cam.Operations does not expose a
        stable public reorder across all API versions, so this CAPABILITY-DETECTS (operations.move /
        op.move / reorder) and applies it if present; otherwise it fail-soft REFUSES with the methods
        that ARE available + the delete-and-recreate fallback. It never pretends to reorder when it
        cannot (R12) — a silent no-op here would corrupt a 100-op program's sequence invisibly."""
        app = adsk.core.Application.get()
        cam = adsk.cam.CAM.cast(app.activeProduct)
        if not cam:
            return {"error": "No CAM product. Switch to MANUFACTURE workspace."}

        setup, op, err = self._resolve_cam_op(
            cam, body.get("setup_name", ""), body.get("setup_index", 0),
            body.get("op_name", body.get("operation_name")), body.get("op_index"),
            require_explicit=True)
        if err:
            return err

        target_index = body.get("target_index")
        if target_index is None:
            return {"error": "Missing target_index (the 0-based position to move the operation to)."}
        try:
            target_index = int(target_index)
        except (TypeError, ValueError):
            return {"error": f"target_index must be an integer, got {target_index!r}"}
        count = setup.operations.count
        if target_index < 0 or target_index >= count:
            return {"error": f"target_index {target_index} out of range (setup '{setup.name}' has {count} operations)"}

        ops = setup.operations
        moved_name = op.name
        # Capability detection — try the most likely public APIs, fail-soft if absent.
        try:
            if hasattr(ops, "move") and callable(getattr(ops, "move")):
                ops.move(op, target_index)
            elif hasattr(op, "move") and callable(getattr(op, "move")):
                op.move(target_index)
            else:
                available = [m for m in dir(ops) if not m.startswith("_")]
                return {
                    "success": False,
                    "supported": False,
                    "operation_name": moved_name,
                    "error": "This Fusion CAM API build exposes no operation-reorder method.",
                    "available_collection_methods": available,
                    "fallback": "Rebuild order by delete (#7 delete) + recreate (POST /cam/operation) in the desired sequence, or author ops in final order up front.",
                }
            adsk.doEvents()
        except Exception as e:
            return {"error": f"reorder failed for '{moved_name}': {str(e)}", "traceback": traceback.format_exc()}

        return {
            "success": True,
            "supported": True,
            "setup_name": setup.name,
            "operation_name": moved_name,
            "target_index": target_index,
            "note": "Operation moved. Verify the new sequence with GET /cam/setups before posting.",
        }

    def _find_library_tool(self, lib_name, product_id):
        """Read a local .tools library file; return the tool dict whose
        product-id or description matches (for tool+holder assembly assignment)."""
        lib_name = os.path.basename(lib_name)
        lib_dir = self._get_tool_library_dir()
        fname = lib_name if lib_name.endswith(".tools") else lib_name + ".tools"
        path = os.path.join(lib_dir, fname)
        if not os.path.isfile(path):
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            return None
        for t in data.get("data", []):
            if t.get("product-id") == product_id or t.get("description") == product_id:
                return t
        return None

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

        # Assign a fully-specified tool+HOLDER assembly from a loaded library
        # (preserves the BIG-PLUS CAT40 holder that inline geometry-only specs
        # drop). Triggered by from_library + product_id; falls through to inline.
        lib_ref = body.get("from_library") or tool_spec.get("from_library")
        prod_id = body.get("product_id") or tool_spec.get("product_id")
        if lib_ref and prod_id:
            lib_tool = self._find_library_tool(lib_ref, prod_id)
            if not lib_tool:
                return {"error": f"Tool '{prod_id}' not found in library '{lib_ref}'"}
            try:
                new_tool = adsk.cam.Tool.createFromJson(json.dumps(lib_tool))
                operation.tool = new_tool
                adsk.doEvents()
                return {
                    "success": True,
                    "operation_name": operation.name,
                    "tool_description": lib_tool.get("description", prod_id),
                    "holder_description": lib_tool.get("holder-description", ""),
                    "has_holder": "holder" in lib_tool,
                    "method": "library_assembly",
                }
            except Exception as e:
                return {"error": str(e), "traceback": traceback.format_exc()}

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
            # This Fusion CAM API exposes the factory as PostProcessInput.create
            # (NOT createInput), arg order (programName, postConfiguration,
            # outputFolder, outputUnits) — programName FIRST, then the .cps path.
            post_input = adsk.cam.PostProcessInput.create(
                program_name, cps_path, output_folder, unit_option
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

            # Find by ID — fast-path via Data.findFileById (resolves directly,
            # NO folder enumeration; the recursive walk below blows Fusion's 60s
            # main-thread cap on large cloud projects). Fallback only on failure.
            if file_id:
                try:
                    direct = app.data.findFileById(file_id)
                    if direct:
                        data_file = direct
                except Exception:
                    data_file = None
                if not data_file:
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

    # ── Assembly automation: insert + mate (5-axis fixture SOP) ───────
    # Makes the JM 5-axis setup SOP API-drivable: open fixture -> insert part ->
    # mate stock to jaws. Insertion is BY file_id (Data.findFileById fast-path) —
    # the cloud Data API cannot ENUMERATE the big JM projects inside Fusion's 60s
    # main-thread cap, so by-id (the id the driver caches from /status) is the only
    # viable insert path. INCH in/out (JM imperial); Fusion internal units are cm,
    # so inch*2.54 -> cm inbound, /2.54 outbound.

    def _insert_component(self, body):
        """POST /component/insert — Insert a cloud component into the active design
        by file_id at an INCH translation, optionally grounded.
        Body: {"file_id":"urn:adsk...","x_in":0,"y_in":0,"z_in":0,
               "ground":false,"is_assembly_context":true}"""
        app = adsk.core.Application.get()
        try:
            design = self._get_design()
        except Exception as e:
            return {"error": str(e)}
        file_id = body.get("file_id", "")
        if not file_id:
            return {"error": "file_id required (urn:adsk... lineage id from /status)."}
        try:
            data_file = app.data.findFileById(file_id)
            if not data_file:
                return {"error": f"File not found for id: {file_id}"}
            tx = float(body.get("x_in", 0.0)) * 2.54
            ty = float(body.get("y_in", 0.0)) * 2.54
            tz = float(body.get("z_in", 0.0)) * 2.54
            transform = adsk.core.Matrix3D.create()
            transform.translation = adsk.core.Vector3D.create(tx, ty, tz)
            is_asm = bool(body.get("is_assembly_context", True))
            root = design.rootComponent
            occ = root.occurrences.addByInsert(data_file, transform, is_asm)
            adsk.doEvents()
            if body.get("ground", False):
                try:
                    occ.isGroundToParent = True
                except Exception:
                    try:
                        occ.isGrounded = True
                    except Exception:
                        pass
            bb = occ.boundingBox
            return {
                "success": True,
                "occurrence_name": occ.name,
                "component_name": occ.component.name,
                "is_grounded": getattr(occ, "isGrounded", None),
                "bbox_in": {
                    "min": [bb.minPoint.x / 2.54, bb.minPoint.y / 2.54, bb.minPoint.z / 2.54],
                    "max": [bb.maxPoint.x / 2.54, bb.maxPoint.y / 2.54, bb.maxPoint.z / 2.54],
                } if bb else None,
            }
        except Exception as e:
            return {"error": str(e), "traceback": traceback.format_exc()}

    def _list_occurrences(self, body):
        """POST /component/list — Enumerate occurrences with INCH bounding boxes +
        grounded state so the driver can identify fixture/part/stock and compute
        mate placement. Also lists root-level bodies (e.g. a stock body)."""
        try:
            design = self._get_design()
        except Exception as e:
            return {"error": str(e)}
        root = design.rootComponent
        occs = []
        try:
            for i in range(root.occurrences.count):
                occ = root.occurrences.item(i)
                try:
                    bb = occ.boundingBox
                    bb_in = {
                        "min": [bb.minPoint.x / 2.54, bb.minPoint.y / 2.54, bb.minPoint.z / 2.54],
                        "max": [bb.maxPoint.x / 2.54, bb.maxPoint.y / 2.54, bb.maxPoint.z / 2.54],
                    } if bb else None
                except Exception:
                    bb_in = None
                occs.append({
                    "index": i,
                    "name": occ.name,
                    "component_name": occ.component.name,
                    "is_grounded": getattr(occ, "isGrounded", None),
                    "body_count": occ.bRepBodies.count,
                    "bbox_in": bb_in,
                })
        except Exception as e:
            return {"error": str(e), "occurrences": occs}
        root_bodies = []
        try:
            for i in range(root.bRepBodies.count):
                root_bodies.append({"index": i, "name": root.bRepBodies.item(i).name})
        except Exception:
            pass
        return {"occurrences": occs, "occurrence_count": len(occs), "root_bodies": root_bodies}

    def _find_occurrence(self, root, name, index):
        """Resolve an occurrence by exact name (occurrence or component), else index."""
        if name:
            for i in range(root.occurrences.count):
                occ = root.occurrences.item(i)
                if occ.name == name or occ.component.name == name:
                    return occ
            return None
        if isinstance(index, int) and 0 <= index < root.occurrences.count:
            return root.occurrences.item(index)
        return None

    def _occ_face(self, occ, flat_index):
        """Resolve an assembly-context BRepFace proxy within an occurrence by a
        flattened index across its bodies' faces (body0 faces, then body1...)."""
        seen = 0
        try:
            for bi in range(occ.bRepBodies.count):
                faces = occ.bRepBodies.item(bi).faces
                fc = faces.count
                if flat_index < seen + fc:
                    return faces.item(flat_index - seen)
                seen += fc
        except Exception:
            return None
        return None

    def _create_joint(self, body):
        """POST /component/joint — Mate two occurrences via a planar-face joint
        (rigid by default; rigid is the SOP's stock<->jaw mate). Body:
          {"occ_one","face_one_index","occ_two","face_two_index",
           "occ_one_index","occ_two_index",
           "key_point":"center","joint_type":"rigid"|"planar",
           "offset_in":0.0,"flip":false}
        Face indices flatten across each occurrence's bodies' faces."""
        try:
            design = self._get_design()
        except Exception as e:
            return {"error": str(e)}
        root = design.rootComponent
        occ1 = self._find_occurrence(root, body.get("occ_one", ""), body.get("occ_one_index", -1))
        occ2 = self._find_occurrence(root, body.get("occ_two", ""), body.get("occ_two_index", -1))
        if not occ1 or not occ2:
            return {"error": f"Occurrence not found: one={bool(occ1)} two={bool(occ2)}"}
        f1 = self._occ_face(occ1, int(body.get("face_one_index", 0)))
        f2 = self._occ_face(occ2, int(body.get("face_two_index", 0)))
        if not f1 or not f2:
            return {"error": f"Planar face not found: one={bool(f1)} two={bool(f2)}"}
        kp_map = {
            "center": adsk.fusion.JointKeyPointTypes.CenterKeyPoint,
            "start": adsk.fusion.JointKeyPointTypes.StartKeyPoint,
            "end": adsk.fusion.JointKeyPointTypes.EndKeyPoint,
            "middle": adsk.fusion.JointKeyPointTypes.MiddleKeyPoint,
        }
        kp = kp_map.get(str(body.get("key_point", "center")).lower(),
                        adsk.fusion.JointKeyPointTypes.CenterKeyPoint)
        try:
            geo1 = adsk.fusion.JointGeometry.createByPlanarFace(f1, None, kp)
            geo2 = adsk.fusion.JointGeometry.createByPlanarFace(f2, None, kp)
            if not geo1 or not geo2:
                return {"error": "createByPlanarFace returned null — both faces must be planar."}
            ji = root.joints.createInput(geo1, geo2)
            jt = str(body.get("joint_type", "rigid")).lower()
            motion = "rigid"
            if jt == "planar":
                try:
                    ji.setAsPlanarJointMotion(adsk.fusion.JointDirections.ZAxisJointDirection)
                    motion = "planar"
                except Exception:
                    ji.setAsRigidJointMotion()
                    motion = "rigid(planar-fallback)"
            else:
                ji.setAsRigidJointMotion()
            if body.get("flip") is not None:
                try:
                    ji.isFlipped = bool(body.get("flip"))
                except Exception:
                    pass
            off = body.get("offset_in")
            if off is not None:
                try:
                    ji.offset = adsk.core.ValueInput.createByReal(float(off) * 2.54)  # in -> cm
                except Exception:
                    pass
            joint = root.joints.add(ji)
            adsk.doEvents()
            return {
                "success": True,
                "joint_name": joint.name,
                "motion": motion,
                "occ_one": occ1.name,
                "occ_two": occ2.name,
                "offset_in": off,
            }
        except Exception as e:
            return {"error": str(e), "traceback": traceback.format_exc()}

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
            # Setup exposes operationType (OperationTypes enum), NOT setupType.
            try:
                _op_type = setup.operationType
            except Exception:
                _op_type = None
            info = {
                "name": setup.name,
                "index": i,
                "type": setup_types.get(_op_type, "Milling"),
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

    def _select_edges(self, body, selection, revolution_axis="Z"):
        """Select edges from a body by keyword or index list.

        Selectors:
            "all"                 — every edge
            "top"                 — edges on the +axis extreme face
            "bottom"              — edges on the -axis extreme face
            "vertical"            — edges aligned WITH the revolution axis
            "internal_horizontal" — circular/horizontal edges perpendicular to
                                    the revolution axis at NON-extreme axial
                                    positions (i.e. internal step transitions —
                                    the load-bearing case for shoulder fillets
                                    on a stepped revolved part)
            list of indices       — explicit edge picks
        """
        all_edges = [body.edges.item(i) for i in range(body.edges.count)]

        if isinstance(selection, list):
            return [all_edges[i] for i in selection if i < len(all_edges)]

        if selection == "all":
            return all_edges

        bb = body.boundingBox

        def axis_min_max(point):
            ax = revolution_axis.upper()
            if ax == "X":
                return point.x
            if ax == "Y":
                return point.y
            return point.z

        top_a = axis_min_max(bb.maxPoint)
        bot_a = axis_min_max(bb.minPoint)
        body_span = top_a - bot_a
        tol = body_span * 0.05 if body_span > 0 else 0.01

        result = []
        for edge in all_edges:
            ebb = edge.boundingBox
            edge_min_a = axis_min_max(ebb.minPoint)
            edge_max_a = axis_min_max(ebb.maxPoint)
            edge_axial_span = abs(edge_max_a - edge_min_a)

            if selection == "top":
                if abs(edge_min_a - top_a) < tol and abs(edge_max_a - top_a) < tol:
                    result.append(edge)
            elif selection == "bottom":
                if abs(edge_min_a - bot_a) < tol and abs(edge_max_a - bot_a) < tol:
                    result.append(edge)
            elif selection == "vertical":
                if body_span > 0 and edge_axial_span > body_span * 0.3:
                    # ensure the edge lies on the axis (small lateral extent)
                    if revolution_axis.upper() == "X":
                        s1 = abs(ebb.maxPoint.y - ebb.minPoint.y)
                        s2 = abs(ebb.maxPoint.z - ebb.minPoint.z)
                    elif revolution_axis.upper() == "Y":
                        s1 = abs(ebb.maxPoint.x - ebb.minPoint.x)
                        s2 = abs(ebb.maxPoint.z - ebb.minPoint.z)
                    else:
                        s1 = abs(ebb.maxPoint.x - ebb.minPoint.x)
                        s2 = abs(ebb.maxPoint.y - ebb.minPoint.y)
                    if s1 < tol and s2 < tol:
                        result.append(edge)
            elif selection == "internal_horizontal":
                # Edge sits in a plane perpendicular to the revolution axis
                # (constant axial coord) AND is NOT on the top/bottom faces.
                # These are the circular edges where OD step transitions live.
                if edge_axial_span < tol:
                    if (abs(edge_min_a - top_a) > tol) and (abs(edge_min_a - bot_a) > tol):
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
