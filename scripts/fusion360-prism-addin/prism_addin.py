"""
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
SETTINGS_PATH = os.path.join(ADDIN_DIR, "prism_settings.json")


# ── Settings ─────────────────────────────────────────────────

def load_settings():
    """Load saved user preferences."""
    defaults = {
        "prism_url": "http://localhost:18361",
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
            _client = PRISMClient(load_settings().get("prism_url", "http://localhost:18361"))
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
                    PALETTE_ID, "PRISM", HTML_PATH,
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

    except Exception:
        if _ui:
            _ui.messageBox("PRISM startup failed:\n" + traceback.format_exc())


def stop(context):
    """Called by Fusion 360 on add-in shutdown."""
    try:
        global _palette, _handlers

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
