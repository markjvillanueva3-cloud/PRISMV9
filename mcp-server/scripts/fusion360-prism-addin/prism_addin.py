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
import json
import threading

# Global references (prevent garbage collection)
_app = None
_ui = None
_handlers = []
_palette = None
_panel_command = None

# Add-in metadata
ADDIN_NAME = "PRISM CAM Optimizer"
ADDIN_ID = "prism_cam_optimizer"
PALETTE_ID = "prism_palette"
PALETTE_TITLE = "PRISM"
COMMAND_ID = "prism_show_panel"
PANEL_ID = "PRISMPanel"
TOOLBAR_TAB = "ToolsTab"

# Paths
ADDIN_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_PATH = os.path.join(ADDIN_DIR, "panel.html")
SETTINGS_PATH = os.path.join(ADDIN_DIR, "prism_settings.json")


def load_settings():
    """Load saved settings (machine, defaults, preferences)."""
    try:
        if os.path.exists(SETTINGS_PATH):
            with open(SETTINGS_PATH, "r") as f:
                return json.load(f)
    except Exception:
        pass
    return {
        "prism_url": "http://localhost:18361",
        "default_material": "P20 Mold Steel",
        "default_machine": "",
        "aggressiveness": 5,
        "auto_optimize": False,
        "show_tooltips": True,
        "onboarding_complete": False,
    }


def save_settings(settings):
    """Persist settings to disk."""
    try:
        with open(SETTINGS_PATH, "w") as f:
            json.dump(settings, f, indent=2)
    except Exception:
        pass


class PRISMCommandCreatedHandler(adsk.core.CommandCreatedEventHandler):
    """Handler for the PRISM toolbar button click."""

    def notify(self, args):
        try:
            global _palette
            palettes = _ui.palettes

            # Check if palette already exists
            _palette = palettes.itemById(PALETTE_ID)
            if _palette is None:
                # Create new palette
                _palette = palettes.add(
                    PALETTE_ID,
                    PALETTE_TITLE,
                    HTML_PATH,
                    True,   # isVisible
                    True,   # showCloseButton
                    True,   # isResizable
                    400,    # width
                    800,    # height
                    True,   # useNewWebBrowser
                )
                _palette.dockingState = adsk.core.PaletteDockingStates.PaletteDockStateRight

                # Register HTML event handlers
                on_html_event = PRISMHTMLEventHandler()
                _palette.incomingFromHTML.add(on_html_event)
                _handlers.append(on_html_event)

                on_closed = PRISMPaletteClosedHandler()
                _palette.closed.add(on_closed)
                _handlers.append(on_closed)
            else:
                _palette.isVisible = True

        except Exception:
            if _ui:
                _ui.messageBox("PRISM Panel Error:\n" + traceback.format_exc())


class PRISMHTMLEventHandler(adsk.core.HTMLEventHandler):
    """Handles messages from the HTML panel (JavaScript → Python)."""

    def notify(self, args):
        try:
            html_args = adsk.core.HTMLEventArgs.cast(args)
            action = html_args.action
            data = json.loads(html_args.data) if html_args.data else {}

            from prism_api_client import PRISMClient
            client = PRISMClient(load_settings().get("prism_url", "http://localhost:18361"))

            result = {}

            if action == "check_connection":
                result = {"connected": client.is_connected()}

            elif action == "get_settings":
                result = load_settings()

            elif action == "save_settings":
                save_settings(data)
                result = {"saved": True}

            elif action == "optimize_all":
                # The main magic button — auto-program everything
                result = self._optimize_all(client, data)

            elif action == "smart_tool_select":
                result = client.smart_tool_select(
                    operation_type=data.get("operation_type", "pocket"),
                    material_iso_group=data.get("material_iso_group", "P"),
                    feature_diameter_mm=data.get("feature_diameter_mm"),
                    feature_depth_mm=data.get("feature_depth_mm"),
                )

            elif action == "generate_program":
                result = client.generate_program(
                    features=data.get("features", []),
                    material=data.get("material", "steel"),
                    machine_name=data.get("machine_name", "generic"),
                    production_mode=True,
                    post_process=True,
                    optimize_sf=True,
                )

            elif action == "export_tool_library":
                result = client.export_tool_library(
                    material_iso_group=data.get("material_iso_group", "P"),
                    max_tools=data.get("max_tools", 50),
                )

            elif action == "dfm_check":
                result = client.dfm_check(
                    features=data.get("features", []),
                    material_iso_group=data.get("material_iso_group", "P"),
                )

            elif action == "chatter_rpm":
                result = client.chatter_safe_rpm(**data)

            elif action == "browse_tools":
                result = client.browse_tools(**data)

            elif action == "get_machine":
                result = client.get_machine_specs(data.get("name", ""))

            elif action == "get_material":
                result = client.get_material_properties(data.get("query", ""))

            elif action == "feasibility_check":
                result = client.feasibility_check(**data)

            elif action == "generate_quote":
                result = client.generate_quote(**data)

            elif action == "generate_probe":
                result = client.generate_probe_program(**data)

            elif action == "compare_programs":
                result = client.compare_programs(**data)

            elif action == "read_fusion_model":
                # Read features from active Fusion CAM setup
                result = self._read_fusion_model()

            elif action == "list_actions":
                result = client.list_actions()

            else:
                result = {"error": f"Unknown action: {action}"}

            # Send result back to HTML panel
            if _palette:
                _palette.sendInfoToHTML(
                    action + "_result",
                    json.dumps(result, default=str),
                )

        except Exception as e:
            if _palette:
                _palette.sendInfoToHTML(
                    "error",
                    json.dumps({"error": str(e), "traceback": traceback.format_exc()}),
                )

    def _optimize_all(self, client, data):
        """The one-click auto-program pipeline."""
        material = data.get("material", "P20 Mold Steel")
        machine = data.get("machine_name", "generic")
        aggressiveness = data.get("aggressiveness", 5)

        # Step 1: Read features from Fusion model
        features = self._read_fusion_features()
        if not features:
            return {"error": "No CAM features found. Create a setup with operations first."}

        # Step 2: Run DFM check
        iso = self._detect_iso(material)
        dfm = client.dfm_check(features=features, material_iso_group=iso)

        # Step 3: Generate optimized program
        result = client.generate_program(
            features=features,
            material=material,
            machine_name=machine,
            production_mode=True,
            post_process=True,
            optimize_sf=True,
        )

        # Step 4: Add DFM results
        if isinstance(result, dict):
            result["dfm"] = dfm
            result["aggressiveness"] = aggressiveness

        return result

    def _read_fusion_model(self):
        """Read the active Fusion 360 CAM setup and extract features."""
        try:
            app = adsk.core.Application.get()
            doc = app.activeDocument
            products = doc.products
            cam_product = products.itemByProductType("CAMProductType")

            if cam_product is None:
                return {"error": "No CAM workspace found. Switch to Manufacturing."}

            cam = adsk.cam.CAM.cast(cam_product)
            if cam.setups.count == 0:
                return {"error": "No setups found. Create a setup first."}

            features = []
            for i in range(cam.setups.count):
                setup = cam.setups.item(i)
                for j in range(setup.operations.count):
                    op = setup.operations.item(j)
                    feature = {
                        "type": self._map_op_type(op.type),
                        "operation": self._map_operation(op),
                        "dimensions": self._extract_dims(op),
                        "setup_id": i,
                    }
                    if op.tool:
                        feature["tool_info"] = {
                            "diameter_mm": op.tool.diameter * 10,  # cm → mm
                            "flute_count": getattr(op.tool, "numberOfFlutes", 3),
                        }
                    features.append(feature)

            return {
                "features": features,
                "setup_count": cam.setups.count,
                "operation_count": len(features),
            }

        except Exception as e:
            return {"error": f"Failed to read model: {str(e)}"}

    def _read_fusion_features(self):
        """Extract features as PRISM CAMFeature format."""
        model = self._read_fusion_model()
        return model.get("features", [])

    def _map_op_type(self, fusion_type):
        """Map Fusion operation type to PRISM feature type."""
        mapping = {
            "face": "face", "pocket": "pocket_rectangular",
            "pocket2d": "pocket_rectangular", "pocket_clearing": "pocket_rectangular",
            "adaptive": "pocket_rectangular", "adaptive2d": "pocket_rectangular",
            "contour": "contour", "contour2d": "contour",
            "slot": "slot", "bore": "bore", "drill": "through_hole",
            "chamfer": "chamfer", "thread": "tapped_hole",
            "parallel": "finishing", "scallop": "finishing",
            "pencil": "corner_cleanup", "morphed_spiral": "finishing",
            "steep_and_shallow": "finishing", "ramp": "roughing",
        }
        return mapping.get(str(fusion_type).lower(), "pocket_rectangular")

    def _map_operation(self, op):
        """Determine roughing/finishing/drilling from Fusion operation."""
        op_type = str(op.type).lower()
        if any(k in op_type for k in ["drill", "bore", "tap", "thread", "ream"]):
            return "drilling"
        if any(k in op_type for k in ["adaptive", "pocket", "rough", "face", "slot"]):
            return "roughing"
        return "finishing"

    def _extract_dims(self, op):
        """Extract dimensions from Fusion operation parameters."""
        try:
            params = op.parameters
            dims = {}
            for name in ["maximumStepdown", "axialStockToLeave", "radialStockToLeave",
                         "tolerance", "maximumStepover"]:
                try:
                    param = params.itemByName(name)
                    if param and param.value:
                        dims[name] = param.value * 10  # cm → mm
                except Exception:
                    pass
            return dims if dims else None
        except Exception:
            return None

    def _detect_iso(self, material):
        """Detect ISO group from material name."""
        m = material.lower()
        if any(k in m for k in ["aluminum", "6061", "7075"]): return "N"
        if any(k in m for k in ["titanium", "ti-"]): return "S"
        if any(k in m for k in ["inconel", "hastelloy"]): return "S"
        if any(k in m for k in ["stainless", "304", "316"]): return "M"
        if any(k in m for k in ["cast iron", "grey"]): return "K"
        if any(k in m for k in ["hardened", "hrc"]): return "H"
        return "P"


class PRISMPaletteClosedHandler(adsk.core.UserInterfaceGeneralEventHandler):
    """Handler for palette close event."""

    def notify(self, args):
        global _palette
        _palette = None


def run(context):
    """Add-in entry point — called by Fusion 360 on startup."""
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
                "Open PRISM CAM Optimizer panel — physics-backed auto-programming",
                os.path.join(ADDIN_DIR, "resources"),
            )

        # Register handler
        on_created = PRISMCommandCreatedHandler()
        cmd_def.commandCreated.add(on_created)
        _handlers.append(on_created)

        # Add to CAM workspace toolbar
        workspace = _ui.workspaces.itemById("CAMEnvironment")
        if workspace:
            toolbar_panels = workspace.toolbarPanels
            panel = toolbar_panels.itemById(PANEL_ID)
            if not panel:
                panel = toolbar_panels.add(PANEL_ID, "PRISM", TOOLBAR_TAB, False)
            control = panel.controls.itemById(COMMAND_ID)
            if not control:
                panel.controls.addCommand(cmd_def)

        # Auto-show panel on startup (if user preference)
        settings = load_settings()
        if settings.get("auto_show_panel", False):
            _ui.commandDefinitions.itemById(COMMAND_ID).execute()

    except Exception:
        if _ui:
            _ui.messageBox("PRISM Add-In startup failed:\n" + traceback.format_exc())


def stop(context):
    """Add-in cleanup — called by Fusion 360 on shutdown."""
    try:
        global _palette, _handlers

        # Close palette
        if _palette:
            _palette.deleteMe()
            _palette = None

        # Remove command
        cmd_def = _ui.commandDefinitions.itemById(COMMAND_ID) if _ui else None
        if cmd_def:
            cmd_def.deleteMe()

        # Remove panel
        if _ui:
            workspace = _ui.workspaces.itemById("CAMEnvironment")
            if workspace:
                panel = workspace.toolbarPanels.itemById(PANEL_ID)
                if panel:
                    panel.deleteMe()

        _handlers = []

    except Exception:
        if _ui:
            _ui.messageBox("PRISM Add-In cleanup failed:\n" + traceback.format_exc())
