r"""
PRISM Add-In for Fusion 360 — Main Entry Point
================================================
Registers the PRISM panel in Fusion 360's CAM workspace toolbar.
Creates an HTML palette sidebar for the PRISM interface.

Install: Copy this folder to %APPDATA%/Autodesk/Autodesk Fusion 360/API/AddIns/
"""

import adsk.core
import adsk.cam
import adsk.fusion
import traceback
import os
import sys
import json
import pathlib

# ── Ensure add-in directory is in Python path ────────────────
ADDIN_DIR = os.path.dirname(os.path.abspath(__file__))
if ADDIN_DIR not in sys.path:
    sys.path.insert(0, ADDIN_DIR)

# Global references (prevent garbage collection)
_app = None
_ui = None
_handlers = []
_palette = None

# Add-in identifiers
ADDIN_NAME = "PRISM CAM Optimizer"
COMMAND_ID = "prism_show_panel_cmd"
PALETTE_ID = "prism_main_palette"
PANEL_ID = "PRISMToolbarPanel"

# Paths
HTML_PATH = os.path.join(ADDIN_DIR, "panel.html")
# Fusion's Chromium-based palette wants a proper file:// URI, not a raw Windows
# path. Passing the path directly produces a mangled URL like
# file:///C:/%5CUsers%5C... when the path contains spaces or backslashes.
# pathlib.Path.as_uri() emits the canonical encoding (file:///C:/Users/Mark%20.../panel.html).
HTML_URL = pathlib.Path(HTML_PATH).resolve().as_uri()
SETTINGS_PATH = os.path.join(ADDIN_DIR, "prism_settings.json")


# ── Settings ─────────────────────────────────────────────────

def load_settings():
    """Load saved user preferences."""
    defaults = {
        "prism_url": "http://localhost:3100",
        "default_material": "P20 Mold Steel",
        "default_machine": "",
        "aggressiveness": 5,
        "show_tooltips": True,
        "onboarding_complete": False,
    }
    try:
        if os.path.exists(SETTINGS_PATH):
            with open(SETTINGS_PATH, "r") as f:
                saved = json.load(f)
                defaults.update(saved)
    except Exception:
        pass
    return defaults


def save_settings(updates):
    """Persist settings to disk (merge with existing)."""
    try:
        current = load_settings()
        current.update(updates)
        with open(SETTINGS_PATH, "w") as f:
            json.dump(current, f, indent=2)
    except Exception:
        pass


# ── PRISM Client (lazy-loaded) ───────────────────────────────

_client = None

def get_client():
    """Get or create PRISM API client."""
    global _client
    if _client is None:
        try:
            from prism_api_client import PRISMClient
            _client = PRISMClient(load_settings().get("prism_url", "http://localhost:3100"))
        except ImportError:
            _client = None
    return _client


# ── Safe Fusion API Helpers ──────────────────────────────────

def get_cam():
    """Safely get the CAM product, or None."""
    try:
        app = adsk.core.Application.get()
        if app and app.activeDocument:
            cam_product = app.activeDocument.products.itemByProductType("CAMProductType")
            if cam_product:
                return adsk.cam.CAM.cast(cam_product)
    except Exception:
        pass
    return None


def get_design():
    """Safely get the Design product, or None."""
    try:
        app = adsk.core.Application.get()
        if app and app.activeDocument:
            design_product = app.activeDocument.products.itemByProductType("DesignProductType")
            if design_product:
                return adsk.fusion.Design.cast(design_product)
    except Exception:
        pass
    return None


def cm_to_mm(val):
    """Convert Fusion internal cm to mm."""
    return val * 10.0 if val else 0.0


def mm_to_cm(val):
    """Convert mm to Fusion internal cm."""
    return val / 10.0 if val else 0.0


# ── Command Handler ──────────────────────────────────────────

class ShowPanelCommandCreated(adsk.core.CommandCreatedEventHandler):
    """Opens the PRISM sidebar panel."""

    def notify(self, args):
        try:
            global _palette
            palettes = _ui.palettes

            _palette = palettes.itemById(PALETTE_ID)
            if _palette is None:
                _palette = palettes.add(
                    PALETTE_ID, "PRISM", HTML_URL,
                    True, True, True, 380, 900, True,
                )
                _palette.dockingState = adsk.core.PaletteDockingStates.PaletteDockStateRight

                # Register event handlers
                html_handler = PaletteHTMLHandler()
                _palette.incomingFromHTML.add(html_handler)
                _handlers.append(html_handler)

                close_handler = PaletteCloseHandler()
                _palette.closed.add(close_handler)
                _handlers.append(close_handler)
            else:
                _palette.isVisible = True

        except Exception:
            if _ui:
                _ui.messageBox("PRISM Error:\n" + traceback.format_exc())


# ── HTML Event Handler ───────────────────────────────────────

class PaletteHTMLHandler(adsk.core.HTMLEventHandler):
    """Handles all messages from the HTML panel."""

    def notify(self, args):
        try:
            html_args = adsk.core.HTMLEventArgs.cast(args)
            action = html_args.action
            data = {}
            try:
                data = json.loads(html_args.data) if html_args.data else {}
            except Exception:
                pass

            # Dispatch to handler method
            handler = getattr(self, f"_handle_{action}", None)
            if handler:
                result = handler(data)
            else:
                result = {"error": f"Unknown action: {action}"}

            # Send result back to HTML
            self._send_result(action, result)

        except Exception as e:
            self._send_result("error", {
                "error": str(e),
                "detail": traceback.format_exc(),
            })

    def _send_result(self, action, result):
        """Send result back to HTML panel."""
        if _palette:
            try:
                _palette.sendInfoToHTML(
                    action + "_result",
                    json.dumps(result, default=str),
                )
            except Exception:
                pass

    # ── Action Handlers ──────────────────────────────────────

    def _handle_check_connection(self, data):
        client = get_client()
        if client:
            return {"connected": client.is_connected()}
        return {"connected": False, "error": "PRISM client not loaded"}

    def _handle_get_settings(self, data):
        return load_settings()

    def _handle_save_settings(self, data):
        save_settings(data)
        return {"saved": True}

    def _handle_get_model_info(self, data):
        """Read current Fusion model info for the panel."""
        design = get_design()
        cam = get_cam()

        info = {
            "has_design": design is not None,
            "has_cam": cam is not None,
            "setup_count": 0,
            "operation_count": 0,
            "part_name": "",
            "bounding_box_mm": {},
        }

        if design:
            root = design.rootComponent
            info["part_name"] = root.name
            bb = root.boundingBox
            if bb:
                info["bounding_box_mm"] = {
                    "x": round(cm_to_mm(bb.maxPoint.x - bb.minPoint.x), 1),
                    "y": round(cm_to_mm(bb.maxPoint.y - bb.minPoint.y), 1),
                    "z": round(cm_to_mm(bb.maxPoint.z - bb.minPoint.z), 1),
                }

        if cam:
            info["setup_count"] = cam.setups.count
            for i in range(cam.setups.count):
                setup = cam.setups.item(i)
                if setup and setup.operations:
                    info["operation_count"] += setup.operations.count

        return info

    def _handle_optimize_all(self, data):
        """The magic button — auto-program everything."""
        client = get_client()
        if not client or not client.is_connected():
            return {"error": "PRISM server not connected. Start the server first."}

        material = data.get("material", "P20 Mold Steel")
        machine = data.get("machine_name", "generic")

        # Step 1: Read features from Fusion
        features = self._read_fusion_features()

        if not features:
            return {
                "error": "No features found. Please:\n"
                         "1. Switch to Manufacturing workspace\n"
                         "2. Create a Setup (right-click part → New Setup)\n"
                         "3. Add at least one operation (e.g., Adaptive Clearing)\n"
                         "4. Then click Optimize All again.",
                "help": "step_by_step",
            }

        # Step 2: Generate optimized program via PRISM
        try:
            result = client.generate_program(
                features=features,
                material=material,
                machine_name=machine,
                production_mode=True,
                post_process=True,
                optimize_sf=True,
            )
        except Exception as e:
            return {"error": f"PRISM optimization failed: {str(e)}"}

        # Step 3: Auto-fill Fusion operations (with undo support)
        fill_report = self._auto_fill_fusion_params(result)

        # Step 4: DFM check
        iso = self._detect_iso(material)
        try:
            dfm = client.dfm_check(features=features, material_iso_group=iso)
        except Exception:
            dfm = {"issues": []}

        # Combine
        if isinstance(result, dict):
            result["fill_report"] = fill_report
            result["dfm"] = dfm
            result["features_count"] = len(features)

        return result

    def _handle_generate_program(self, data):
        """Generate G-code without auto-filling Fusion."""
        client = get_client()
        if not client or not client.is_connected():
            return {"error": "PRISM server not connected."}

        features = data.get("features") or self._read_fusion_features()
        if not features:
            return {"error": "No features to generate program for."}

        return client.generate_program(
            features=features,
            material=data.get("material", "steel"),
            machine_name=data.get("machine_name", "generic"),
            production_mode=True,
            post_process=True,
            optimize_sf=True,
        )

    def _handle_run_full_pipeline(self, data):
        """End-to-end: print/CAD upload → AI draws → CAM → adaptive post.

        Routes through `prism_cam:auto_print_to_program` (AutoPrintToProgramBridgeEngine)
        which detects format → recognizes features → selects strategy → generates
        toolpaths → posts with adaptive per-block speed/feed.

        Expected `data` shape (from panel.html runFullPipeline()):
            content_base64: str  — file content, base64-encoded
            filename:       str
            format_hint:    str  — file extension (step, iges, dxf, pdf, ...)
            process_type:   str  — auto | milling | turning | multi_axis | mill_turn | wedm
            material_name:  str  — optional, defaults to AutoPipelineInput default (D2)
            controller:     str  — optional, controller name for post processor
        """
        client = get_client()
        if not client or not client.is_connected():
            return {"error": "PRISM server not connected. Start the server first."}

        b64 = data.get("content_base64", "")
        if not b64:
            return {"error": "No file content received."}

        # AutoPrintToProgramBridgeEngine.AutoPipelineInput.content is typed
        # `string` and consumed by detectFormat()/countFeatures() as text.
        # That's fine for STEP/IGES/DXF (all ASCII), but binary formats
        # (PDF, PNG, JPG) would be corrupted by `errors="replace"` decode
        # and the engine has no binary code path today. Reject explicitly.
        TEXT_FORMATS = {"step", "stp", "igs", "iges", "dxf", "json", "txt", ""}
        BINARY_FORMATS = {"pdf", "png", "jpg", "jpeg", "stl", "3mf"}
        fmt = (data.get("format_hint") or "").lower().lstrip(".")
        if fmt in BINARY_FORMATS:
            return {"error": (
                f"Binary format '.{fmt}' is not yet wired into the pipeline. "
                "Supported: STEP, IGES, DXF, JSON, plain text. "
                "Binary→features needs AutoPrintToProgramBridgeEngine to grow "
                "a base64 input branch (track as TODO)."
            )}
        if fmt and fmt not in TEXT_FORMATS:
            return {"error": (
                f"Unsupported format '.{fmt}'. "
                f"Supported text formats: {sorted(TEXT_FORMATS - {''})}"
            )}

        try:
            import base64
            raw = base64.b64decode(b64)
        except Exception as e:
            return {"error": f"Could not decode base64 payload: {e}"}

        # Validate decoded bytes really are text — catches a binary file
        # with a misleading extension before it reaches the engine.
        try:
            content = raw.decode("utf-8")
        except UnicodeDecodeError:
            try:
                content = raw.decode("latin-1")  # STEP/IGES from some CAD systems
            except Exception:
                return {"error": (
                    "File appears to be binary; pipeline currently only "
                    "accepts text-encoded CAD (STEP/IGES/DXF). Re-export "
                    "your CAD file as STEP AP214 (ASCII) and try again."
                )}

        params = {
            "content": content,
            "format": data.get("format_hint") or None,
            "process_type": data.get("process_type") or "auto",
            "material_name": data.get("material_name") or None,
            "controller": data.get("controller") or None,
            "filename": data.get("filename") or "",
        }
        # Strip None values so the engine's optional fields stay optional.
        params = {k: v for k, v in params.items() if v is not None}

        # ── Stage 1 (optional): AI orchestration plan ──────────
        # ai_milling_agi proposes a high-level strategy (process plan,
        # tool selection bias, sequencing hints). Result is fed forward
        # to the main pipeline as `ai_plan`.
        ai_plan = None
        ai_warnings = []
        if data.get("use_ai_orchestration"):
            try:
                ai_resp = client.call_action("prism_ai:ai_milling_agi", {
                    "task": "auto_print_to_program",
                    "filename": params["filename"],
                    "format": params.get("format"),
                    "process_type": params["process_type"],
                    "material_name": params.get("material_name"),
                })
                ai_plan = (ai_resp or {}).get("result", ai_resp)
                params["ai_plan"] = ai_plan
            except Exception as e:
                ai_warnings.append(f"AI orchestration unavailable: {e}")

        # ── Stage 2: main pipeline ────────────────────────────
        try:
            result = client.call_action("prism_cam:auto_print_to_program", params)
        except Exception as e:
            return {"error": f"Pipeline call failed: {e}"}

        pipeline = result.get("result", result) if isinstance(result, dict) else {}

        # ── Stage 3 (optional): simulation / verification ─────
        verify_with = data.get("verify_with") or "none"
        sim_result = None
        if verify_with != "none" and isinstance(pipeline, dict):
            gcode = pipeline.get("gcode") or pipeline.get("nc_program")
            sim_action = {
                "cnc_predictive": "prism_cam:cnc_simulate_predictive",
                "twin":           "prism_ai:ai_milling_twin_simulate",
                "vericut":        "prism_cam:vericut_export",
                "fusion":         None,  # user runs Fusion's built-in sim manually
            }.get(verify_with)
            if sim_action and gcode:
                try:
                    sim_resp = client.call_action(sim_action, {
                        "gcode": gcode,
                        "controller": params.get("controller"),
                        "material_name": params.get("material_name"),
                    })
                    sim_result = (sim_resp or {}).get("result", sim_resp)
                except Exception as e:
                    ai_warnings.append(f"{verify_with} simulator failed: {e}")
            elif sim_action and not gcode:
                ai_warnings.append(
                    f"Skipped {verify_with} sim — pipeline produced no G-code"
                )

        # ── Stage 4 (optional): final collision check ─────────
        collision = None
        if data.get("final_collision_check") and isinstance(pipeline, dict):
            try:
                col_resp = client.call_action("prism_cam:collision_check_full", {
                    "gcode": pipeline.get("gcode"),
                    "controller": params.get("controller"),
                })
                collision = (col_resp or {}).get("result", col_resp)
            except Exception as e:
                ai_warnings.append(f"Collision check failed: {e}")

        # ── Stage 5 (U2): cost / quote rollup ────────────────
        # Promised "cost efficient" — call quote_estimate with the
        # pipeline-derived cycle time + tool list + material so the
        # operator sees what this run will actually cost before they
        # send it to the machine.
        cost = None
        if isinstance(pipeline, dict):
            try:
                cost_resp = client.call_action("prism_business:quote_estimate", {
                    "material_name": params.get("material_name"),
                    "machine": params.get("controller"),
                    "cycle_time_min": pipeline.get("cycle_time_min"),
                    "tool_list": pipeline.get("tools") or pipeline.get("tool_list"),
                    "stock_z_mm": params.get("stock_z_mm"),
                    "features_count": pipeline.get("features_detected"),
                })
                cost = (cost_resp or {}).get("result", cost_resp)
            except Exception as e:
                ai_warnings.append(f"Cost rollup failed: {e}")

        # ── Stage 6 (U1): safety gate ────────────────────────
        # shop_floor tier requires S(x) >= 0.98; engineering tier 0.70.
        # See state/shared/omega-thresholds.json. Operator can override
        # (U8) — when override is set we still record the bypass in
        # telemetry so it shows up in audit. Collision findings always
        # block regardless of safety_score (they're a separate signal).
        safety_score = None
        safety_blocked = False
        safety_reason = None
        if isinstance(pipeline, dict):
            safety_score = pipeline.get("safety_score")
            tier = (data.get("safety_tier") or "shop_floor").lower()
            threshold = 0.98 if tier == "shop_floor" else 0.70
            override = bool(data.get("safety_override"))

            if safety_score is not None and safety_score < threshold and not override:
                safety_blocked = True
                safety_reason = (
                    f"S(x)={safety_score:.3f} below {tier} threshold {threshold:.2f}. "
                    "Pipeline output is unsafe to deliver."
                )
            elif collision and isinstance(collision, dict):
                hits = collision.get("collisions_found", 0)
                if hits and not override:
                    safety_blocked = True
                    safety_reason = (
                        f"Collision check found {hits} hit(s). "
                        "Pipeline output is unsafe to deliver."
                    )

            if safety_blocked:
                # Try to fetch human-readable remediation; never block on
                # remediation lookup failing.
                try:
                    expl = client.call_action("prism_guard:safety_explain_brief", {
                        "safety_score": safety_score,
                        "collision_hits": (collision or {}).get("collisions_found", 0),
                        "tier": tier,
                    })
                    pipeline["safety_remediation"] = (expl or {}).get("result", expl)
                except Exception:
                    pass

        # ── Aggregate ─────────────────────────────────────────
        if isinstance(pipeline, dict):
            pipeline["ai_plan"] = ai_plan
            pipeline["sim_result"] = sim_result
            pipeline["sim_engine"] = verify_with
            pipeline["collision_check"] = collision
            pipeline["cost"] = cost
            pipeline["safety_blocked"] = safety_blocked
            pipeline["safety_reason"] = safety_reason
            pipeline["safety_tier"] = (data.get("safety_tier") or "shop_floor")
            pipeline["safety_override_used"] = bool(data.get("safety_override"))
            existing_warnings = pipeline.get("warnings") or []
            for w in ai_warnings:
                existing_warnings.append({"severity": "warning", "stage": "addin", "message": w})
            pipeline["warnings"] = existing_warnings

        # ── U5: telemetry — record the run for cross-chat orchestration ──
        try:
            from telemetry import record_pipeline_run
            record_pipeline_run({
                "filename": params.get("filename"),
                "format": params.get("format"),
                "process_type": params.get("process_type"),
                "material_name": params.get("material_name"),
                "controller": params.get("controller"),
                "ai_orchestration": bool(data.get("use_ai_orchestration")),
                "verify_with": data.get("verify_with"),
                "safety_score": safety_score,
                "safety_blocked": safety_blocked,
                "safety_override": bool(data.get("safety_override")),
                "cycle_time_min": (pipeline or {}).get("cycle_time_min"),
                "cost_usd": (cost or {}).get("total_usd") if isinstance(cost, dict) else None,
                "features_detected": (pipeline or {}).get("features_detected"),
                "warnings_count": len((pipeline or {}).get("warnings") or []),
                "success": (pipeline or {}).get("success", False) and not safety_blocked,
            })
        except Exception:
            # Telemetry must NEVER break the user-facing pipeline.
            pass

        return {"result": pipeline}

    # ── U3: write G-code to a file the operator can run ────────
    def _handle_save_gcode(self, data):
        """Save a G-code blob to a user-chosen path.

        The HTML side passes `gcode` and a default `filename`. We open
        Fusion's native file-save dialog so the file lands wherever the
        operator wants (typically a network share or USB stick).
        Refuses to write if `safety_blocked=True` was set on the
        previous pipeline run, unless `force=True` is passed (used by
        the engineering-mode override).
        """
        if data.get("safety_blocked") and not data.get("force"):
            return {
                "error": "Cannot save G-code: previous pipeline run was "
                         "safety-blocked. Re-run after fixing the issue, "
                         "or enable Engineering mode override."
            }
        gcode = data.get("gcode") or ""
        if not gcode:
            return {"error": "No G-code to save."}

        default_name = data.get("filename") or "prism_program.nc"
        try:
            dialog = _ui.createFileDialog()
            dialog.title = "Save PRISM G-code"
            dialog.filter = "NC files (*.nc;*.tap;*.txt);;All files (*.*)"
            dialog.filename = default_name
            if dialog.showSave() != 0:  # 0 == DialogOK in Fusion's enum
                return {"error": "Save cancelled."}
            target = dialog.filename
        except Exception:
            # Headless / API-not-ready fallback: write next to the add-in.
            target = os.path.join(ADDIN_DIR, default_name)

        try:
            with open(target, "w", encoding="utf-8", newline="\r\n") as fp:
                fp.write(gcode)
        except OSError as e:
            return {"error": f"Could not write {target}: {e}"}

        return {"saved_path": target, "lines": gcode.count("\n") + 1}

    # ── U4: write pipeline result back into Fusion's CAM tree ──
    def _handle_apply_to_fusion(self, data):
        """Create Setup + operations + post inline from pipeline result.

        Two delivery paths:
          1. **Autodesk MCP path** (preferred when the add-in is reachable
             and `data["use_autodesk_mcp"]` is truthy or unset). Drives
             Fusion via the official MCP add-in — works even when the
             caller is not inside Fusion's Python interpreter.
          2. **In-process path** (fallback). Uses the legacy
             `_auto_fill_fusion_params` which depends on the active CAM
             workspace already being open in this Fusion session.

        Refuses if the previous pipeline run was safety-blocked unless
        the engineering-mode override is set on `data["force"]`.
        """
        pipeline = data.get("pipeline") or {}
        if not isinstance(pipeline, dict):
            return {"error": "No pipeline result provided."}
        if pipeline.get("safety_blocked") and not data.get("force"):
            return {
                "error": "Cannot apply to Fusion: pipeline was "
                         "safety-blocked. Override required."
            }

        prefer_autodesk = data.get("use_autodesk_mcp", True)
        autodesk_attempted = False
        if prefer_autodesk:
            try:
                from autodesk_mcp_client import get_default_client, AutodeskFusionMCPError
                client = get_default_client()
                if client.is_available(max_wait_s=2.0):
                    autodesk_attempted = True
                    # Apply the toolpath result via the MCP add-in. The
                    # exact tool name depends on the add-in version —
                    # `apply_pipeline_result` is the canonical name PRISM
                    # registers; falls back to a generic create-setup +
                    # add-operations dance if the add-in lacks it.
                    try:
                        applied = client.call_tool("apply_pipeline_result", {
                            "pipeline": pipeline,
                        })
                    except AutodeskFusionMCPError:
                        applied = self._apply_via_autodesk_primitives(client, pipeline)
                    return {
                        "applied": True,
                        "via": "autodesk_mcp",
                        "result": applied,
                    }
            except ImportError:
                pass  # client module not installed — fall through
            except Exception as e:
                # Autodesk MCP attempt failed — record and fall back.
                # Caller still gets a result.
                pipeline.setdefault("warnings", []).append({
                    "severity": "warning",
                    "stage": "apply_to_fusion",
                    "message": f"Autodesk MCP path failed; using in-process fallback: {e}",
                })

        # In-process fallback.
        try:
            report = self._auto_fill_fusion_params(pipeline)
        except Exception as e:
            return {"error": f"Auto-fill failed: {e}", "autodesk_attempted": autodesk_attempted}
        return {"applied": True, "via": "in_process", "report": report}

    def _apply_via_autodesk_primitives(self, client, pipeline):
        """Compose `create_cam_setup` + `add_operation` + post via MCP.

        Used when the Autodesk MCP add-in doesn't expose a single
        `apply_pipeline_result` shortcut tool. Returns a summary report
        in the same shape as `_auto_fill_fusion_params`.
        """
        report = {"created_setups": 0, "added_operations": 0, "via": "autodesk_primitives"}

        # Create one setup per pipeline (most pipelines are single-setup).
        setup_name = pipeline.get("setup_name") or "PRISM Pipeline"
        client.create_setup(setup_name, stock=pipeline.get("stock"), wcs=pipeline.get("wcs"))
        report["created_setups"] = 1

        for op in pipeline.get("operations") or []:
            try:
                client.call_tool("add_cam_operation", {
                    "setup_name": setup_name,
                    "operation": op,
                })
                report["added_operations"] += 1
            except Exception as e:
                report.setdefault("errors", []).append(str(e))

        return report

    # ── Bridge #1+#2: Autodesk Fusion MCP connector ───────────────
    # Lets the panel (and any caller of the panel handler chain) drive
    # Fusion via Autodesk's official MCP add-in instead of going through
    # PRISM's HTTP server. Used for cross-chat orchestration where the
    # call doesn't originate inside Fusion's Python interpreter.

    def _handle_check_autodesk_mcp(self, data):
        """Probe whether Autodesk Fusion MCP add-in is reachable.

        Cheap (<= 2s) — used by the panel to render the status dot.
        Returns {available: bool, url: str, tools_count: int|None}.
        """
        try:
            from autodesk_mcp_client import get_default_client
            client = get_default_client()
            available = client.is_available(max_wait_s=2.0)
            tools_count = None
            if available:
                try:
                    tools_count = len(client.list_tools())
                except Exception:
                    tools_count = None
            return {
                "available": bool(available),
                "url": client.url,
                "tools_count": tools_count,
            }
        except Exception as e:
            return {"available": False, "error": str(e)}

    def _handle_autodesk_mcp_call(self, data):
        """Generic passthrough — invoke any Autodesk MCP tool by name.

        data: { tool: str, arguments: dict }
        Returns whatever the tool returned, or {error: ...}.
        """
        tool = data.get("tool")
        if not tool:
            return {"error": "Missing 'tool' name."}
        try:
            from autodesk_mcp_client import get_default_client, AutodeskFusionMCPError
        except ImportError as e:
            return {"error": f"autodesk_mcp_client unavailable: {e}"}
        client = get_default_client()
        try:
            result = client.call_tool(tool, data.get("arguments") or {})
            return {"result": result}
        except AutodeskFusionMCPError as e:
            return {"error": str(e), "code": e.code, "data": e.data}
        except Exception as e:
            return {"error": f"Autodesk MCP call failed: {e}"}

    def _handle_autodesk_post_active(self, data):
        """Run a PRISM .cps post on the currently active Fusion CAM program.

        data: { post_path: str, output_path: str }
        Returns {posted: True, ...} or {error: ...}.
        """
        post_path = data.get("post_path")
        output_path = data.get("output_path")
        if not post_path or not output_path:
            return {"error": "Both post_path and output_path are required."}
        if not os.path.isfile(post_path):
            return {"error": f"Post file not found: {post_path}"}

        try:
            from autodesk_mcp_client import get_default_client, AutodeskFusionMCPError
            client = get_default_client()
            result = client.post_active_program(post_path, output_path)
            return {"posted": True, "result": result, "output_path": output_path}
        except AutodeskFusionMCPError as e:
            return {"error": str(e), "code": e.code}
        except Exception as e:
            return {"error": f"Post-via-Autodesk failed: {e}"}

    def _handle_export_tools(self, data):
        """Export PRISM tool library as .tools file."""
        client = get_client()
        if not client or not client.is_connected():
            return {"error": "PRISM server not connected."}

        result = client.export_tool_library(
            material_iso_group=data.get("material_iso_group", "P"),
            max_tools=data.get("max_tools", 50),
        )

        if result and "tools" in result:
            # Save to Fusion's tool library location
            path = self._get_fusion_tools_path()
            if path:
                filepath = os.path.join(path, "PRISM_Tools.tools")
                try:
                    with open(filepath, "w") as f:
                        json.dump({"version": 2, "data": result["tools"]}, f, indent=2)
                    result["saved_to"] = filepath
                    result["instruction"] = "Tools saved. In Fusion: Manage > Tool Library > Import"
                except Exception as e:
                    result["save_error"] = str(e)

        return result

    def _handle_browse_tools(self, data):
        client = get_client()
        if not client: return {"error": "Not connected"}
        return client.browse_tools(**data)

    def _handle_chatter_rpm(self, data):
        client = get_client()
        if not client: return {"error": "Not connected"}
        return client.chatter_safe_rpm(**data)

    def _handle_dfm_check(self, data):
        client = get_client()
        if not client: return {"error": "Not connected"}
        features = data.get("features") or self._read_fusion_features()
        return client.dfm_check(features=features, material_iso_group=data.get("material_iso_group", "P"))

    def _handle_list_actions(self, data):
        client = get_client()
        if not client: return {"error": "Not connected"}
        return client.list_actions()

    # ── Fusion Model Reading ─────────────────────────────────

    def _read_fusion_features(self):
        """Extract features from Fusion CAM operations."""
        cam = get_cam()
        if not cam or cam.setups.count == 0:
            return []

        features = []
        for si in range(cam.setups.count):
            setup = cam.setups.item(si)
            if not setup or not setup.operations:
                continue
            for oi in range(setup.operations.count):
                op = setup.operations.item(oi)
                if not op:
                    continue

                feat = {
                    "type": self._map_fusion_op_type(op),
                    "operation": self._map_fusion_operation(op),
                }

                # Extract dimensions (all conversions cm→mm)
                dims = {}
                try:
                    params = op.parameters
                    if params:
                        for pname, dname in [
                            ("maximumStepdown", "depth_mm"),
                            ("maximumStepover", "width_mm"),
                        ]:
                            try:
                                p = params.itemByName(pname)
                                if p:
                                    val = p.expression
                                    # Try numeric value
                                    dims[dname] = round(cm_to_mm(float(val) if val.replace('.','').replace('-','').isdigit() else p.value), 2)
                            except Exception:
                                pass
                except Exception:
                    pass

                if dims:
                    feat["dimensions"] = dims

                # Extract tool info
                try:
                    if op.tool:
                        feat["tool_info"] = {
                            "diameter_mm": round(cm_to_mm(op.tool.diameter), 2),
                        }
                except Exception:
                    pass

                features.append(feat)

        return features

    def _map_fusion_op_type(self, op):
        """Map Fusion operation to PRISM feature type."""
        try:
            op_type = str(op.type).lower() if op.type else ""
        except Exception:
            return "pocket_rectangular"

        mapping = {
            "face": "face", "pocket": "pocket_rectangular",
            "pocket2d": "pocket_rectangular", "adaptive": "pocket_rectangular",
            "adaptive2d": "pocket_rectangular", "contour": "contour",
            "contour2d": "contour", "slot": "slot",
            "drill": "through_hole", "bore": "bore",
            "chamfer": "chamfer", "thread": "tapped_hole",
            "parallel": "finishing", "scallop": "finishing",
            "pencil": "corner_cleanup",
        }
        return mapping.get(op_type, "pocket_rectangular")

    def _map_fusion_operation(self, op):
        """Determine roughing/finishing/drilling."""
        try:
            op_type = str(op.type).lower() if op.type else ""
        except Exception:
            return "roughing"

        if any(k in op_type for k in ["drill", "bore", "tap", "thread"]):
            return "drilling"
        if any(k in op_type for k in ["parallel", "scallop", "pencil", "contour", "steep"]):
            return "finishing"
        return "roughing"

    # ── Auto-Fill Fusion Parameters ──────────────────────────

    def _auto_fill_fusion_params(self, prism_result):
        """Set Fusion operation parameters from PRISM recommendations.

        Records original values for potential undo.
        All values converted mm→cm for Fusion internal units.
        """
        cam = get_cam()
        if not cam:
            return {"filled": 0, "note": "No CAM workspace"}

        tool_list = prism_result.get("tool_list", []) if isinstance(prism_result, dict) else []
        filled = 0
        originals = []

        try:
            for si in range(cam.setups.count):
                setup = cam.setups.item(si)
                if not setup or not setup.operations:
                    continue
                for oi in range(setup.operations.count):
                    op = setup.operations.item(oi)
                    if not op:
                        continue

                    tool_idx = min(oi, len(tool_list) - 1) if tool_list else -1
                    if tool_idx < 0:
                        continue

                    tool = tool_list[tool_idx]
                    rec = tool.get("recommended_params", {})
                    if not rec:
                        continue

                    try:
                        params = op.parameters
                        if not params:
                            continue

                        original = {"setup": si, "op": oi, "params": {}}

                        # Set spindle speed (RPM — no unit conversion needed)
                        rpm = rec.get("rpm")
                        if rpm:
                            self._safe_set_param(params, "tool_spindleSpeed", rpm, original)

                        # Set feed rate (mm/min → cm/min for Fusion)
                        feed = rec.get("feed_mmmin")
                        if feed:
                            self._safe_set_param(params, "tool_feedCutting", mm_to_cm(feed), original)

                        # Set DOC (mm → cm)
                        doc = rec.get("ap_mm")
                        if doc:
                            self._safe_set_param(params, "maximumStepdown", mm_to_cm(doc), original)

                        # Set WOC (mm → cm)
                        woc = rec.get("ae_mm")
                        if woc:
                            self._safe_set_param(params, "maximumStepover", mm_to_cm(woc), original)

                        if original["params"]:
                            originals.append(original)
                            filled += 1

                    except Exception:
                        continue

        except Exception as e:
            return {"filled": filled, "error": str(e)}

        # Save originals for undo
        if originals:
            try:
                undo_path = os.path.join(ADDIN_DIR, "prism_undo.json")
                with open(undo_path, "w") as f:
                    json.dump(originals, f, indent=2)
            except Exception:
                pass

        return {"filled": filled, "originals_saved": len(originals)}

    def _safe_set_param(self, params, name, value, original_record):
        """Safely set a Fusion parameter, recording the original value."""
        try:
            p = params.itemByName(name)
            if p:
                # Record original
                try:
                    original_record["params"][name] = p.value
                except Exception:
                    pass
                # Set new value
                try:
                    p.value = value
                except Exception:
                    # Some params use expression instead of value
                    try:
                        p.expression = str(value)
                    except Exception:
                        pass
        except Exception:
            pass  # Parameter doesn't exist for this operation type

    # ── Helpers ───────────────────────────────────────────────

    def _detect_iso(self, material):
        m = material.lower()
        if any(k in m for k in ["aluminum", "6061", "7075"]): return "N"
        if any(k in m for k in ["titanium", "ti-"]): return "S"
        if any(k in m for k in ["inconel"]): return "S"
        if any(k in m for k in ["stainless", "304", "316"]): return "M"
        if any(k in m for k in ["cast iron"]): return "K"
        if any(k in m for k in ["hardened", "hrc"]): return "H"
        return "P"

    def _get_fusion_tools_path(self):
        """Find Fusion's local tool library folder."""
        try:
            # Common Fusion tool library locations
            appdata = os.environ.get("LOCALAPPDATA", "")
            if appdata:
                fusion_base = os.path.join(appdata, "Autodesk", "webdeploy", "production")
                if os.path.exists(fusion_base):
                    # Find the latest hash folder
                    for item in sorted(os.listdir(fusion_base), reverse=True):
                        lib_path = os.path.join(fusion_base, item, "Libraries")
                        if os.path.exists(lib_path):
                            return lib_path
        except Exception:
            pass
        # Fallback to add-in directory
        return ADDIN_DIR


# ── Palette Close Handler ────────────────────────────────────

class PaletteCloseHandler(adsk.core.UserInterfaceGeneralEventHandler):
    def notify(self, args):
        global _palette
        _palette = None


# ── Add-In Entry Points ─────────────────────────────────────

def run(context):
    """Called by Fusion 360 on add-in startup."""
    global _app, _ui

    try:
        _app = adsk.core.Application.get()
        _ui = _app.userInterface

        # Create command definition
        cmd_def = _ui.commandDefinitions.itemById(COMMAND_ID)
        if not cmd_def:
            cmd_def = _ui.commandDefinitions.addButtonDefinition(
                COMMAND_ID,
                ADDIN_NAME,
                "Open PRISM panel — physics-backed auto-programming\n"
                "73,827 tools • 910 machines • 35-stage optimizer",
                "",  # No custom icon folder — uses default
            )

        on_created = ShowPanelCommandCreated()
        cmd_def.commandCreated.add(on_created)
        _handlers.append(on_created)

        # Add to CAM workspace toolbar
        try:
            workspace = _ui.workspaces.itemById("CAMEnvironment")
            if workspace:
                panels = workspace.toolbarPanels
                panel = panels.itemById(PANEL_ID)
                if not panel:
                    panel = panels.add(PANEL_ID, "PRISM", "", False)
                ctrl = panel.controls.itemById(COMMAND_ID)
                if not ctrl:
                    panel.controls.addCommand(cmd_def)
        except Exception:
            pass  # CAM workspace may not be active yet — that's OK

        # ── Excel Bridge sub-module ─────────────────────────────
        # Folds the legacy standalone PRISM-ExcelBridge add-in into this
        # one. Watches C:\PRISM\fusion-bridge\part_request.json and builds
        # parametric CAD parts from JSON (Excel VBA macros write the JSON).
        try:
            import excel_bridge
            excel_bridge.start_watcher(_app, _ui)
        except Exception:
            # Excel Bridge failure must NOT take down the CAM panel — log
            # via messageBox in dev, swallow in prod.
            try:
                if _ui:
                    _ui.messageBox(
                        "Excel Bridge failed to start (CAM panel still works):\n"
                        + traceback.format_exc(),
                        "PRISM",
                    )
            except Exception:
                pass

    except Exception:
        if _ui:
            _ui.messageBox("PRISM startup failed:\n" + traceback.format_exc())


def stop(context):
    """Called by Fusion 360 on add-in shutdown."""
    try:
        global _palette, _handlers

        # Tear down Excel Bridge first so the daemon thread releases the
        # custom event before we drop UI handles.
        try:
            import excel_bridge
            excel_bridge.stop_watcher()
        except Exception:
            pass

        if _palette:
            _palette.deleteMe()
            _palette = None

        if _ui:
            cmd = _ui.commandDefinitions.itemById(COMMAND_ID)
            if cmd:
                cmd.deleteMe()

            try:
                ws = _ui.workspaces.itemById("CAMEnvironment")
                if ws:
                    panel = ws.toolbarPanels.itemById(PANEL_ID)
                    if panel:
                        panel.deleteMe()
            except Exception:
                pass

        _handlers = []

    except Exception:
        if _ui:
            _ui.messageBox("PRISM cleanup failed:\n" + traceback.format_exc())
