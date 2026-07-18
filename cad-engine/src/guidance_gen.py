"""Step-by-Step Guidance Generator — CC-MS10.

Transforms recipes, recommendations, and practice records into
platform-specific step-by-step guidance with menu paths.

Supports CAD platforms (SolidWorks, Fusion 360, CATIA, NX, Creo)
and CAM platforms (Mastercam, hyperMILL, PowerMill, Fusion CAM, ESPRIT).

References:
  - CC-MS8 PlatformMapper for cross-platform term resolution
  - CC-MS9 validation bridge for safety annotations
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ---------------------------------------------------------------------------
# Platform definitions
# ---------------------------------------------------------------------------

class Platform(str, Enum):
    # CAD
    SOLIDWORKS = "solidworks"
    FUSION360 = "fusion360"
    CATIA = "catia"
    NX = "nx"
    CREO = "creo"
    # CAM
    MASTERCAM = "mastercam"
    HYPERMILL = "hypermill"
    POWERMILL = "powermill"
    FUSION_CAM = "fusion_cam"
    ESPRIT = "esprit"
    # Generic
    GENERIC = "generic"


# Platform-specific menu paths for common CAD operations
_CAD_MENU_PATHS: dict[str, dict[str, str]] = {
    "extrude": {
        "solidworks": "Insert > Boss/Base > Extrude",
        "fusion360": "Create > Extrude",
        "catia": "Insert > Pad",
        "nx": "Insert > Design Feature > Extrude",
        "creo": "Model > Extrude",
        "generic": "Create > Extrude",
    },
    "cut_extrude": {
        "solidworks": "Insert > Cut > Extrude",
        "fusion360": "Create > Extrude (Cut)",
        "catia": "Insert > Pocket",
        "nx": "Insert > Design Feature > Extrude (Subtract)",
        "creo": "Model > Extrude > Remove Material",
        "generic": "Create > Cut Extrude",
    },
    "hole": {
        "solidworks": "Insert > Features > Hole Wizard",
        "fusion360": "Create > Hole",
        "catia": "Insert > Hole",
        "nx": "Insert > Design Feature > Hole",
        "creo": "Model > Hole",
        "generic": "Create > Hole",
    },
    "fillet": {
        "solidworks": "Insert > Features > Fillet/Round",
        "fusion360": "Modify > Fillet",
        "catia": "Insert > Edge Fillet",
        "nx": "Insert > Detail Feature > Edge Blend",
        "creo": "Model > Round",
        "generic": "Modify > Fillet",
    },
    "chamfer": {
        "solidworks": "Insert > Features > Chamfer",
        "fusion360": "Modify > Chamfer",
        "catia": "Insert > Chamfer",
        "nx": "Insert > Detail Feature > Chamfer",
        "creo": "Model > Chamfer",
        "generic": "Modify > Chamfer",
    },
    "sketch": {
        "solidworks": "Insert > Sketch (select plane)",
        "fusion360": "Create > Sketch (select plane)",
        "catia": "Start > Sketcher (select plane)",
        "nx": "Insert > Sketch (select plane)",
        "creo": "Model > Sketch (select plane)",
        "generic": "Create > Sketch",
    },
    "pattern_linear": {
        "solidworks": "Insert > Pattern/Mirror > Linear Pattern",
        "fusion360": "Create > Pattern > Rectangular Pattern",
        "catia": "Insert > Rectangular Pattern",
        "nx": "Insert > Associative Copy > Instance Feature > Linear Array",
        "creo": "Model > Pattern > Direction",
        "generic": "Create > Linear Pattern",
    },
    "pattern_circular": {
        "solidworks": "Insert > Pattern/Mirror > Circular Pattern",
        "fusion360": "Create > Pattern > Circular Pattern",
        "catia": "Insert > Circular Pattern",
        "nx": "Insert > Associative Copy > Instance Feature > Circular Array",
        "creo": "Model > Pattern > Axis",
        "generic": "Create > Circular Pattern",
    },
    "mirror": {
        "solidworks": "Insert > Pattern/Mirror > Mirror",
        "fusion360": "Create > Mirror",
        "catia": "Insert > Mirror",
        "nx": "Insert > Associative Copy > Mirror Feature",
        "creo": "Model > Mirror",
        "generic": "Create > Mirror",
    },
    "thread": {
        "solidworks": "Insert > Features > Thread",
        "fusion360": "Create > Thread",
        "catia": "Insert > Thread/Tap",
        "nx": "Insert > Design Feature > Thread",
        "creo": "Model > Cosmetic Thread",
        "generic": "Create > Thread",
    },
}

# Platform-specific menu paths for CAM operations
_CAM_MENU_PATHS: dict[str, dict[str, str]] = {
    "pocket_2d": {
        "mastercam": "Toolpaths > 2D > Pocket",
        "hypermill": "Job List > Add > 2D > Pocket Milling",
        "powermill": "Toolpath Strategies > Pocket Finishing",
        "fusion_cam": "Milling > 2D > 2D Pocket",
        "esprit": "Machining > Mill > Pocket",
        "generic": "CAM > 2D Pocket",
    },
    "adaptive": {
        "mastercam": "Toolpaths > 2D > Dynamic Mill",
        "hypermill": "Job List > Add > 2D > Adaptive Pocket",
        "powermill": "Toolpath Strategies > Vortex",
        "fusion_cam": "Milling > 2D > 2D Adaptive",
        "esprit": "Machining > Mill > Adaptive",
        "generic": "CAM > Adaptive Roughing",
    },
    "contour": {
        "mastercam": "Toolpaths > 2D > Contour",
        "hypermill": "Job List > Add > 2D > Contour Milling",
        "powermill": "Toolpath Strategies > Profile Finishing",
        "fusion_cam": "Milling > 2D > 2D Contour",
        "esprit": "Machining > Mill > Contour",
        "generic": "CAM > 2D Contour",
    },
    "face_mill": {
        "mastercam": "Toolpaths > 2D > Face",
        "hypermill": "Job List > Add > 2D > Face Milling",
        "powermill": "Toolpath Strategies > Face Milling",
        "fusion_cam": "Milling > 2D > Face",
        "esprit": "Machining > Mill > Face",
        "generic": "CAM > Face Mill",
    },
    "drilling": {
        "mastercam": "Toolpaths > Drilling",
        "hypermill": "Job List > Add > Drilling",
        "powermill": "Toolpath Strategies > Drilling",
        "fusion_cam": "Milling > Drilling",
        "esprit": "Machining > Drill",
        "generic": "CAM > Drilling",
    },
}


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class GuidanceStep:
    """A single step in a guidance sequence."""
    number: int
    action: str
    menu_path: str = ""
    parameters: dict = field(default_factory=dict)
    note: str = ""
    warning: str = ""
    screenshot_placeholder: str = ""

    def to_dict(self) -> dict:
        d: dict = {
            "number": self.number,
            "action": self.action,
        }
        if self.menu_path:
            d["menu_path"] = self.menu_path
        if self.parameters:
            d["parameters"] = self.parameters
        if self.note:
            d["note"] = self.note
        if self.warning:
            d["warning"] = self.warning
        if self.screenshot_placeholder:
            d["screenshot_placeholder"] = self.screenshot_placeholder
        return d


@dataclass
class GuidanceDocument:
    """Complete step-by-step guidance document."""
    title: str
    platform: str
    domain: str  # "cad" or "cam"
    operation: str
    steps: list[GuidanceStep] = field(default_factory=list)
    prerequisites: list[str] = field(default_factory=list)
    safety_warnings: list[str] = field(default_factory=list)
    material: str = ""
    tool_info: str = ""
    validation_status: str = "validated"
    sources: list[str] = field(default_factory=list)

    @property
    def step_count(self) -> int:
        return len(self.steps)

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "platform": self.platform,
            "domain": self.domain,
            "operation": self.operation,
            "step_count": self.step_count,
            "steps": [s.to_dict() for s in self.steps],
            "prerequisites": self.prerequisites,
            "safety_warnings": self.safety_warnings,
            "material": self.material,
            "tool_info": self.tool_info,
            "validation_status": self.validation_status,
            "sources": self.sources,
        }


# ---------------------------------------------------------------------------
# GuidanceGenerator
# ---------------------------------------------------------------------------

class GuidanceGenerator:
    """Generates platform-specific step-by-step guidance.

    Takes a recipe (operation + parameters + material) and target platform,
    produces ordered steps with platform-specific menu paths.
    """

    def __init__(self, default_platform: str = "generic"):
        self._default_platform = default_platform.lower()

    def generate_cad_guidance(
        self,
        operation: str,
        parameters: dict,
        platform: str = "",
        material: str = "",
    ) -> GuidanceDocument:
        """Generate CAD operation guidance with platform menu paths."""
        plat = (platform or self._default_platform).lower()
        op = operation.lower().replace(" ", "_")

        doc = GuidanceDocument(
            title=f"{operation.replace('_', ' ').title()} — {plat.title()}",
            platform=plat,
            domain="cad",
            operation=op,
            material=material,
            sources=["PRISM platform maps (CC-MS8)"],
        )

        # Add prerequisites
        doc.prerequisites = [
            f"Open {plat.replace('_', ' ').title()} with target part file",
            "Ensure correct units (mm) are set",
        ]

        # Build steps based on operation type
        if op in ("extrude", "cut_extrude"):
            doc.steps = self._cad_extrude_steps(op, parameters, plat)
        elif op == "hole":
            doc.steps = self._cad_hole_steps(parameters, plat)
        elif op in ("fillet", "chamfer"):
            doc.steps = self._cad_fillet_chamfer_steps(op, parameters, plat)
        elif op == "sketch":
            doc.steps = self._cad_sketch_steps(parameters, plat)
        elif op in ("pattern_linear", "pattern_circular"):
            doc.steps = self._cad_pattern_steps(op, parameters, plat)
        else:
            doc.steps = self._cad_generic_steps(op, parameters, plat)

        return doc

    def generate_cam_guidance(
        self,
        strategy_type: str,
        parameters: dict,
        platform: str = "",
        material: str = "",
    ) -> GuidanceDocument:
        """Generate CAM strategy guidance with platform menu paths."""
        plat = (platform or self._default_platform).lower()
        st = strategy_type.lower().replace(" ", "_")

        doc = GuidanceDocument(
            title=f"{strategy_type.replace('_', ' ').title()} Strategy — {plat.title()}",
            platform=plat,
            domain="cam",
            operation=st,
            material=material,
            sources=["PRISM strategy DB", "CC-MS9 CAM safety overlay"],
        )

        doc.prerequisites = [
            f"Open {plat.replace('_', ' ').title()} with CAM setup",
            "Stock geometry defined",
            "Tool library loaded",
        ]

        # Safety warnings for specific materials
        if material.lower() in ("titanium", "inconel", "ti-6al-4v"):
            doc.safety_warnings.append(
                f"SAFETY: {material} requires flood coolant — dry machining forbidden"
            )
        if material.lower() in ("magnesium",):
            doc.safety_warnings.append(
                "SAFETY: Magnesium — fire risk with fine chips. Use mineral oil coolant only."
            )

        doc.steps = self._cam_strategy_steps(st, parameters, plat, material)
        doc.tool_info = self._format_tool_info(parameters)

        return doc

    # -- CAD step builders --

    def _get_menu_path(self, op: str, platform: str, paths_dict: dict) -> str:
        paths = paths_dict.get(op, {})
        return paths.get(platform, paths.get("generic", f"Menu > {op.replace('_', ' ').title()}"))

    def _cad_extrude_steps(self, op: str, params: dict, plat: str) -> list[GuidanceStep]:
        menu = self._get_menu_path(op, plat, _CAD_MENU_PATHS)
        depth = params.get("depth", params.get("height", 10.0))
        steps = [
            GuidanceStep(1, "Select the sketch plane (Front/Top/Right or existing face)",
                        menu_path=self._get_menu_path("sketch", plat, _CAD_MENU_PATHS)),
            GuidanceStep(2, "Create the profile sketch with required dimensions",
                        note="Ensure sketch is fully constrained"),
            GuidanceStep(3, "Exit sketch and apply extrude feature",
                        menu_path=menu,
                        parameters={"depth": f"{depth}mm", "direction": params.get("direction", "one-side")}),
            GuidanceStep(4, "Verify feature in the feature tree"),
        ]
        return steps

    def _cad_hole_steps(self, params: dict, plat: str) -> list[GuidanceStep]:
        menu = self._get_menu_path("hole", plat, _CAD_MENU_PATHS)
        diameter = params.get("diameter", 10.0)
        depth = params.get("depth", 20.0)
        steps = [
            GuidanceStep(1, "Select the target face for hole placement",
                        note="Face normal determines hole direction"),
            GuidanceStep(2, "Launch hole feature",
                        menu_path=menu),
            GuidanceStep(3, "Configure hole parameters",
                        parameters={"diameter": f"{diameter}mm", "depth": f"{depth}mm",
                                   "type": params.get("type", "simple")}),
            GuidanceStep(4, "Position the hole center on the face",
                        note="Use sketch dimensions or existing geometry for precise placement"),
            GuidanceStep(5, "Confirm and verify hole feature"),
        ]
        return steps

    def _cad_fillet_chamfer_steps(self, op: str, params: dict, plat: str) -> list[GuidanceStep]:
        menu = self._get_menu_path(op, plat, _CAD_MENU_PATHS)
        radius = params.get("radius", params.get("size", 2.0))
        steps = [
            GuidanceStep(1, f"Select edge(s) for {op}"),
            GuidanceStep(2, f"Apply {op} feature",
                        menu_path=menu,
                        parameters={"radius" if op == "fillet" else "distance": f"{radius}mm"}),
            GuidanceStep(3, "Verify result — check for tangency/interference issues"),
        ]
        return steps

    def _cad_sketch_steps(self, params: dict, plat: str) -> list[GuidanceStep]:
        menu = self._get_menu_path("sketch", plat, _CAD_MENU_PATHS)
        return [
            GuidanceStep(1, "Select sketch plane", menu_path=menu),
            GuidanceStep(2, "Draw geometry using line/arc/circle/rectangle tools"),
            GuidanceStep(3, "Add dimensions to fully constrain the sketch",
                        note="Sketch should show 'Fully Defined' status"),
            GuidanceStep(4, "Exit sketch mode"),
        ]

    def _cad_pattern_steps(self, op: str, params: dict, plat: str) -> list[GuidanceStep]:
        menu = self._get_menu_path(op, plat, _CAD_MENU_PATHS)
        count = params.get("count", 4)
        spacing = params.get("spacing", 20.0)
        steps = [
            GuidanceStep(1, "Select feature(s) to pattern"),
            GuidanceStep(2, f"Apply {'linear' if 'linear' in op else 'circular'} pattern",
                        menu_path=menu,
                        parameters={"count": count, "spacing": f"{spacing}mm"}),
            GuidanceStep(3, "Select direction reference (edge, axis, or plane)"),
            GuidanceStep(4, "Verify all instances are correctly placed"),
        ]
        return steps

    def _cad_generic_steps(self, op: str, params: dict, plat: str) -> list[GuidanceStep]:
        menu = self._get_menu_path(op, plat, _CAD_MENU_PATHS)
        return [
            GuidanceStep(1, "Select geometry/face for operation"),
            GuidanceStep(2, f"Apply {op.replace('_', ' ')} feature",
                        menu_path=menu, parameters=params),
            GuidanceStep(3, "Configure parameters and confirm"),
        ]

    # -- CAM step builders --

    def _cam_strategy_steps(
        self, strategy: str, params: dict, plat: str, material: str,
    ) -> list[GuidanceStep]:
        menu = self._get_menu_path(strategy, plat, _CAM_MENU_PATHS)
        tool_dia = params.get("tool_diameter", 10.0)
        rpm = params.get("rpm", params.get("spindle_rpm", 0))
        feed = params.get("feed_per_tooth", params.get("fz", 0))
        ap = params.get("axial_depth", params.get("ap", 0))
        vc = params.get("cutting_speed", params.get("vc", 0))

        steps = [
            GuidanceStep(1, "Select tool from library",
                        parameters={"diameter": f"{tool_dia}mm"},
                        note=f"Material: {material}" if material else ""),
            GuidanceStep(2, "Create new toolpath operation",
                        menu_path=menu),
            GuidanceStep(3, "Define machining region (select geometry/containment)"),
        ]

        # Parameter step
        param_dict: dict = {}
        if vc:
            param_dict["cutting_speed"] = f"{vc} m/min"
        if rpm:
            param_dict["spindle_rpm"] = rpm
        if feed:
            param_dict["feed_per_tooth"] = f"{feed} mm/tooth"
        if ap:
            param_dict["axial_depth"] = f"{ap} mm"

        if param_dict:
            steps.append(GuidanceStep(4, "Set cutting parameters",
                                     parameters=param_dict))
        else:
            steps.append(GuidanceStep(4, "Set cutting parameters from tool library defaults"))

        steps.extend([
            GuidanceStep(5, "Configure leads/links and entry/exit strategy"),
            GuidanceStep(6, "Generate and verify toolpath",
                        note="Check for gouges, collisions, and air cuts"),
            GuidanceStep(7, "Simulate toolpath before posting",
                        warning="ALWAYS simulate before running on machine"),
        ])

        return steps

    def _format_tool_info(self, params: dict) -> str:
        parts = []
        if d := params.get("tool_diameter"):
            parts.append(f"D{d}mm")
        if f := params.get("num_flutes", params.get("flutes")):
            parts.append(f"{f}-flute")
        if c := params.get("coating"):
            parts.append(c)
        return " ".join(parts) if parts else ""
