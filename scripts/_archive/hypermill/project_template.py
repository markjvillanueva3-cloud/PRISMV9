"""
project_template.py — Generate a new hyperMILL project from a PRISM template.

Creates a structured hyperMILL project directory with standard sub-folders,
a job list skeleton, and a machine configuration stub. Templates are
parameterized by machine, material group, and controller family.

Usage:
    python project_template.py --name MyPart --machine DMG_DMU50 --material P
    python project_template.py --name MyPart --controller HEIDENHAIN --output ./projects
    python project_template.py --list-templates
"""

import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

log = logging.getLogger(__name__)

BUILTIN_TEMPLATES = {
    "milling_3axis": {
        "description": "Standard 3-axis milling project",
        "folders": ["01_Geometry", "02_Stock", "03_Fixtures", "04_Jobs", "05_NC"],
        "default_controller": "FANUC",
        "default_strategy": "2d_contour",
    },
    "milling_5axis": {
        "description": "5-axis simultaneous milling project",
        "folders": ["01_Geometry", "02_Stock", "03_Fixtures", "04_Jobs", "05_NC", "06_Simulation"],
        "default_controller": "HEIDENHAIN",
        "default_strategy": "5ax_tangent",
    },
    "turning": {
        "description": "Turning + milling (mill-turn) project",
        "folders": ["01_Geometry", "02_Stock", "03_Jobs", "04_NC"],
        "default_controller": "FANUC",
        "default_strategy": "turning_roughing",
    },
}


def list_templates() -> None:
    """Print all built-in project templates with descriptions."""
    print("Available hyperMILL project templates:")
    for name, tmpl in BUILTIN_TEMPLATES.items():
        print(f"  {name:20s} — {tmpl['description']}")


def create_project(
    project_name: str,
    template_name: str,
    machine: str,
    material_group: str,
    controller: str | None,
    output_dir: Path,
) -> dict:
    """
    Create a new hyperMILL project directory tree from a template.

    @param project_name: Human-readable project name (becomes directory name)
    @param template_name: Key into BUILTIN_TEMPLATES
    @param machine: Machine identifier (e.g. 'DMG_DMU50')
    @param material_group: ISO material group ('P','M','K','N','S','H')
    @param controller: Controller family override (None = use template default)
    @param output_dir: Parent directory in which to create the project folder
    @returns: Dictionary with project creation metadata
    """
    if template_name not in BUILTIN_TEMPLATES:
        raise ValueError(f"Unknown template '{template_name}'. Use --list-templates to see options.")

    tmpl = BUILTIN_TEMPLATES[template_name]
    ctrl = controller or tmpl["default_controller"]
    project_dir = output_dir / project_name

    project_dir.mkdir(parents=True, exist_ok=True)
    for folder in tmpl["folders"]:
        (project_dir / folder).mkdir(exist_ok=True)

    # Write project manifest
    manifest = {
        "project_name": project_name,
        "template": template_name,
        "machine": machine,
        "material_group": material_group,
        "controller": ctrl,
        "default_strategy": tmpl["default_strategy"],
        "created_at": datetime.utcnow().isoformat() + "Z",
        "prism_generated": True,
    }
    (project_dir / "project_manifest.json").write_text(json.dumps(manifest, indent=2))

    # Write empty job list
    job_list: list = []
    (project_dir / "04_Jobs" / "job_list.json").write_text(json.dumps(job_list, indent=2))

    log.info(f"Project created: {project_dir}")
    return {"project_dir": str(project_dir), "manifest": manifest}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate a new hyperMILL project directory from a PRISM template."
    )
    parser.add_argument("--name", type=str, help="Project name (becomes directory name)")
    parser.add_argument(
        "--template", type=str, default="milling_3axis",
        choices=list(BUILTIN_TEMPLATES.keys()),
        help="Template to use (default: milling_3axis)"
    )
    parser.add_argument("--machine", type=str, default="GENERIC_3AXIS", help="Machine identifier")
    parser.add_argument(
        "--material", type=str, default="P",
        choices=["P", "M", "K", "N", "S", "H"],
        help="ISO material group (default: P)"
    )
    parser.add_argument("--controller", type=str, default=None, help="Controller family override")
    parser.add_argument(
        "--output", type=Path, default=Path("."),
        help="Parent directory for new project (default: current directory)"
    )
    parser.add_argument("--list-templates", action="store_true", help="List available templates and exit")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")

    args = parser.parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(message)s",
    )

    if args.list_templates:
        list_templates()
        return 0

    if not args.name:
        log.error("--name is required unless --list-templates is used")
        return 1

    result = create_project(
        args.name, args.template, args.machine, args.material, args.controller, args.output
    )
    print(json.dumps({"status": "ok", **result}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
