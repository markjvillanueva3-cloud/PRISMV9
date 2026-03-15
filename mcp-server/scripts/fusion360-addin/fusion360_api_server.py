"""
PRISM Fusion 360 API Server Add-In
===================================
Runs inside Fusion 360 as an add-in, providing HTTP API for external CAD control.

Install:
  1. Copy this folder to: %APPDATA%/Autodesk/Autodesk Fusion 360/API/AddIns/PRISMBridge/
  2. In Fusion 360: Utilities -> Add-Ins -> PRISMBridge -> Run
  3. Server starts on http://localhost:18360

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
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 18360
_app = None
_ui = None
_server = None
_server_thread = None


# ── HTTP Handler ────────────────────────────────────────────────────

class FusionAPIHandler(BaseHTTPRequestHandler):
    """Handles HTTP requests and dispatches to Fusion 360 API calls."""

    def log_message(self, format, *args):
        """Suppress default stderr logging."""
        pass

    # ── GET ──────────────────────────────────────────────────────────

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        try:
            if path == "/status":
                self._respond(self._get_status())
            elif path == "/geometry":
                self._respond(self._get_geometry())
            elif path == "/health":
                self._respond({"status": "ok", "port": PORT})
            elif path == "/tool-library":
                self._respond(self._list_tool_libraries())
            elif path == "/tool-library/search":
                q = query.get("q", [""])[0]
                tool_type = query.get("type", [""])[0]
                self._respond(self._search_tool_libraries(q, tool_type))
            else:
                self._respond({"error": f"Unknown endpoint: {path}"}, 404)
        except Exception as e:
            self._respond({"error": str(e), "traceback": traceback.format_exc()}, 500)

    # ── POST ─────────────────────────────────────────────────────────

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(content_length)) if content_length > 0 else {}
        path = urlparse(self.path).path

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
        }

        try:
            handler = dispatch.get(path)
            if handler is None:
                result = {"error": f"Unknown endpoint: {path}"}
                self._respond(result, 404)
                return
            result = handler(body)
            self._respond(result)
        except Exception as e:
            self._respond({"error": str(e), "traceback": traceback.format_exc()}, 500)

    # ── Response helper ──────────────────────────────────────────────

    def _respond(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode("utf-8"))

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
        local_ns = {
            "adsk": adsk,
            "app": adsk.core.Application.get(),
        }
        try:
            exec(code, local_ns)
            result_val = local_ns.get("result", None)
            return {"success": True, "result": result_val}
        except Exception as e:
            return {"success": False, "error": str(e), "traceback": traceback.format_exc()}

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
        feature = chamfers.addEqualDistance(edge_collection, adsk.core.ValueInput.createByReal(distance_cm))
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

        # Create a point on a face for hole placement
        point = adsk.core.Point3D.create(position[0] / 10.0, position[1] / 10.0, 0)

        holes = root.features.holeFeatures
        hole_input = holes.createSimpleInput(adsk.core.ValueInput.createByReal(diameter_cm / 2.0))
        hole_input.setPositionByPoint(
            root.bRepBodies.item(0).faces.item(0),
            point,
        )
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
            # Find face with highest max Z
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
        app = adsk.core.Application.get()
        design = self._get_design()

        fmt = body.get("format", "step").lower()
        export_path = body.get("path", "")
        if not export_path:
            return {"success": False, "error": "Missing 'path' field"}

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
        doc.undo()
        return {"success": True}

    # ── POST /new ────────────────────────────────────────────────────

    def _new_document(self, body):
        app = adsk.core.Application.get()
        doc_name = body.get("name", "PRISM Part")
        doc = app.documents.add(adsk.core.DocumentTypes.FusionDesignDocumentType)
        design = adsk.fusion.Design.cast(app.activeProduct)
        if body.get("parametric", True):
            design.designType = adsk.fusion.DesignTypes.ParametricDesignType
        return {
            "success": True,
            "document_name": doc.name,
            "design_type": "parametric" if design.designType == adsk.fusion.DesignTypes.ParametricDesignType else "direct",
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

    # ── DELETE ─────────────────────────────────────────────────────────

    def do_DELETE(self):
        path = urlparse(self.path).path
        try:
            if path.startswith("/tool-library/"):
                lib_name = path[len("/tool-library/"):]
                if not lib_name:
                    self._respond({"error": "Missing library name in URL"}, 400)
                    return
                self._respond(self._delete_tool_library(lib_name))
            else:
                self._respond({"error": f"Unknown endpoint: {path}"}, 404)
        except Exception as e:
            self._respond({"error": str(e), "traceback": traceback.format_exc()}, 500)

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
        library_name = body.get("library_name", "PRISM")
        if not tools:
            return {"error": "Missing or empty 'tools' array", "success": False}

        # Try adsk.cam API first
        try:
            app = adsk.core.Application.get()
            cam_product = adsk.cam.CAM.cast(app.activeProduct)
            if cam_product is None:
                raise RuntimeError("CAM workspace not active")

            # Access tool libraries through CAM
            tool_libs = cam_product.toolLibraries
            # Find or create library by URL
            lib_url = None
            local_libs = tool_libs.toolLibraryUrls
            for i in range(local_libs.count):
                url = local_libs.item(i)
                if url.toString().endswith(library_name) or url.leafName == library_name:
                    lib_url = url
                    break

            if lib_url is None:
                # Create new library in local folder
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
                    # Individual tool import failure — skip and continue
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

            # Load existing library file if present
            existing_tools = []
            if os.path.isfile(file_path):
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        existing_data = json.load(f)
                    existing_tools = existing_data.get("data", [])
                except Exception:
                    existing_tools = []

            # Build a set of existing tool descriptions for dedup
            existing_descs = set()
            for t in existing_tools:
                desc = t.get("description", t.get("product-id", ""))
                if desc:
                    existing_descs.add(desc)

            imported = 0
            for tool_data in tools:
                desc = tool_data.get("description", tool_data.get("product-id", ""))
                if desc and desc in existing_descs:
                    # Update existing tool in-place
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

        # Try adsk.cam API first
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
            # Fallback: list .tools files in the library directory
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

        # Try adsk.cam API first
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
            # Fallback: search .tools files
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
        # Try adsk.cam API first
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

            # Not found via API — try file fallback
            raise RuntimeError("Library not found via CAM API, trying file fallback")

        except Exception:
            # Fallback: delete .tools file
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
                if abs(edge_min_z - bot_z) < tol and abs(edge_max_z - top_z) < tol:
                    result.append(edge)
        return result


# ── Add-in Lifecycle ─────────────────────────────────────────────────

def run(context):
    """Called by Fusion 360 when the add-in starts."""
    global _app, _ui, _server, _server_thread
    try:
        _app = adsk.core.Application.get()
        _ui = _app.userInterface

        _server = HTTPServer(("127.0.0.1", PORT), FusionAPIHandler)
        _server_thread = threading.Thread(target=_server.serve_forever, daemon=True)
        _server_thread.start()

        _ui.messageBox(f"PRISM Bridge started on port {PORT}")
    except Exception:
        if _ui:
            _ui.messageBox(f"PRISM Bridge failed to start:\n{traceback.format_exc()}")


def stop(context):
    """Called by Fusion 360 when the add-in stops."""
    global _server, _ui
    try:
        if _server:
            _server.shutdown()
            _server = None
        if _ui:
            _ui.messageBox("PRISM Bridge stopped")
    except Exception:
        if _ui:
            _ui.messageBox(f"PRISM Bridge stop error:\n{traceback.format_exc()}")
